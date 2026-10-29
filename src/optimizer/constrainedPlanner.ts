import { CraftingState } from './state';
import {
  applySkillOutcomes,
  calculateDisplayedSkillGains,
  calculateEffectiveActionCosts,
  getAvailableSkills,
  getBlockedSkillReasons,
  getBuffDiscordantConditions,
  getConditionEffectsForConfig,
  techniqueDisplayName,
  type OptimizerConfig,
  type SkillDefinition,
} from './skills';
import {
  resolvePlanningGoals,
  classifyOutcome,
  willAutoFinish,
} from './outcome';
import { getBonusAndChance, type CraftingCondition } from './gameTypes';
import type {
  SearchConfig,
  SearchResult,
  SkillRecommendation,
  OutcomeProjection,
} from './search';
import { generatedConditions } from './conditionOutcomes';
import { projectNativeAutoUseBranches } from './nativeAutoUsePlan';

export interface PlanningValue {
  goalProbabilityLowerBound: number;
  prematureEndProbability: number;
  /** Heuristic only; never presented as a goal probability. */
  frontierProgress: number;
  resourceReserve: number;
  expectedSteps: number;
  unresolvedProbability: number;
  transitionUnresolvedProbability?: number;
}

/** One ordering for recursive policies, root actions and worker merges. */
export function comparePlanningValues(
  a: PlanningValue,
  b: PlanningValue,
): number {
  const goalDifference =
    b.goalProbabilityLowerBound - a.goalProbabilityLowerBound;
  const failureDifference =
    a.prematureEndProbability - b.prematureEndProbability;
  const values = [
    // A single lexicographic order is essential for transitive worker merging.
    // On resolved policies failure and goal probability are complements, so
    // minimizing failure also maximizes goal probability. Unresolved policies
    // retain the conservative preference without a pair-dependent comparator.
    failureDifference,
    goalDifference,
    b.frontierProgress - a.frontierProgress,
    a.expectedSteps - b.expectedSteps,
    b.resourceReserve - a.resourceReserve,
  ];
  return values.find((v) => Math.abs(v) > 1e-10) ?? 0;
}

type ForecastEntry = CraftingCondition | number;
interface PendingCondition {
  current: CraftingCondition;
  queue: ForecastEntry[];
  harmony: number;
  discordance: number;
}
interface NodeState {
  state: CraftingState;
  condition: CraftingCondition;
  queue: ForecastEntry[];
  pending: Record<number, PendingCondition>;
}
interface Child extends NodeState {
  probability: number;
}
interface Action {
  skill: SkillDefinition;
  children: Child[];
  unresolved: number;
  uncertain?: boolean;
  immediate: PlanningValue;
}
interface Policy {
  value: PlanningValue;
  action?: Action;
  next?: Policy;
}
class SearchBudgetReached extends Error {
  constructor() {
    super('Search budget reached');
    Object.setPrototypeOf(this, SearchBudgetReached.prototype);
  }
}

/** Exact per-call identity: all state fields, buff definitions, step and forecast. */
function stateKey(node: NodeState): string {
  return JSON.stringify(
    [node.condition, node.queue, node.pending, node.state],
    (key, value: unknown) => {
      if (key === 'history' || key === '_cacheKey') return undefined;
      if (value instanceof Map)
        return Array.from(value.entries()).sort(([a], [b]) =>
          String(a).localeCompare(String(b)),
        );
      return value;
    },
  );
}

/** Bounded finite-horizon AND/OR search. Missing branches remain unknown. */
export function constrainedSearch(
  state: CraftingState,
  config: OptimizerConfig,
  targetCompletion: number,
  targetPerfection: number,
  depth = 48,
  currentCondition: CraftingCondition = 'neutral',
  forecast: CraftingCondition[] = [],
  settings: Partial<SearchConfig> = {},
): SearchResult {
  const started = Date.now();
  const goals = resolvePlanningGoals(
    config,
    targetCompletion,
    targetPerfection,
    settings,
  );
  const attained = (s: CraftingState) =>
    s.completion >= goals.completion && s.perfection >= goals.perfection;
  const ended = (s: CraftingState) => willAutoFinish(s, goals.bands);
  const reached = (s: CraftingState) => attained(s) && ended(s);
  const budget = Math.max(1, settings.maxNodes ?? 100000);
  const time = Math.max(1, settings.timeBudgetMs ?? 2000);
  const horizon = Math.max(1, Math.min(96, Math.floor(depth)));
  const width = Math.max(2, Math.floor(settings.beamWidth ?? 8));
  let nodes = 0,
    hits = 0,
    pruned = 0;
  const memo = new Map<string, Policy>();
  const transitions = new Map<string, Action[]>();
  const check = () => {
    if (
      nodes >= budget ||
      Date.now() - started >= time ||
      settings.shouldAbort?.()
    )
      throw new SearchBudgetReached();
  };
  const progress = (s: CraftingState) => {
    const c =
      goals.completion > 0 ? Math.min(1, s.completion / goals.completion) : 1;
    const p =
      goals.perfection > 0 ? Math.min(1, s.perfection / goals.perfection) : 1;
    return (Math.min(c, p) + (c + p) / 2) / 2;
  };
  const reserve = (s: CraftingState) =>
    Math.max(0, s.qi) / Math.max(1, config.maxQi) +
    ((attained(s) ? -1 : 1) * Math.max(0, s.stability)) /
      Math.max(1, s.initialMaxStability);
  const leaf = (s: CraftingState): PlanningValue => ({
    goalProbabilityLowerBound: reached(s) ? 1 : 0,
    prematureEndProbability: !reached(s) && ended(s) ? 1 : 0,
    frontierProgress: progress(s),
    resourceReserve: reserve(s),
    expectedSteps: 0,
    unresolvedProbability: !reached(s) && !ended(s) ? 1 : 0,
  });
  const combine = (action: Action, values: PlanningValue[]): PlanningValue => {
    if (action.uncertain && values.length) {
      return {
        goalProbabilityLowerBound: Math.min(
          ...values.map((v) => v.goalProbabilityLowerBound),
        ),
        prematureEndProbability: Math.max(
          action.unresolved,
          ...values.map((v) => v.prematureEndProbability),
        ),
        frontierProgress: Math.min(...values.map((v) => v.frontierProgress)),
        resourceReserve: Math.min(...values.map((v) => v.resourceReserve)),
        expectedSteps: 1 + Math.max(...values.map((v) => v.expectedSteps)),
        unresolvedProbability: Math.max(
          action.unresolved,
          ...values.map((v) => v.unresolvedProbability),
        ),
      };
    }
    const value: PlanningValue = {
      goalProbabilityLowerBound: 0,
      prematureEndProbability: action.unresolved,
      frontierProgress: 0,
      resourceReserve: 0,
      expectedSteps: 1,
      unresolvedProbability: action.unresolved,
    };
    action.children.forEach((child, i) => {
      const p = child.probability,
        v = values[i];
      value.goalProbabilityLowerBound += p * v.goalProbabilityLowerBound;
      value.prematureEndProbability += p * v.prematureEndProbability;
      value.frontierProgress += p * v.frontierProgress;
      value.resourceReserve += p * v.resourceReserve;
      value.expectedSteps += p * v.expectedSteps;
      value.unresolvedProbability += p * v.unresolvedProbability;
    });
    return value;
  };
  // If conditions cannot change any mechanics, their labels need not multiply states.
  const conditionRelevant = Boolean(
    config.nativeAutoUsePlan ||
    config.conditionEffectsData ||
    config.conditionEffectType ||
    config.skills.some((s) => s.conditionRequirement),
  );
  const expand = (node: NodeState): Action[] => {
    const key = stateKey(node),
      cached = transitions.get(key);
    if (cached) {
      hits++;
      return cached;
    }
    const actions: Action[] = [];
    // Native auto-use can make a previously unaffordable technique legal.
    const native = projectNativeAutoUseBranches(
      node.state,
      config,
      node.condition,
    );
    const roster = config.nativeAutoUsePlan
      ? config.skills
      : getAvailableSkills(node.state, config, node.condition);
    for (const skill of roster) {
      check();
      nodes++;
      if (skill.actionKind === 'finish') continue;
      const effects = getConditionEffectsForConfig(config, node.condition);
      const before =
        skill.actionKind === 'item'
          ? {
              outcomes: [{ state: node.state, probability: 1 }],
              unresolvedProbability: 0,
            }
          : native;
      const distribution: {
        outcomes: Array<{ state: CraftingState; probability: number }>;
        unresolvedProbability: number;
        probabilityUncertain?: boolean;
      } = { outcomes: [], unresolvedProbability: before.unresolvedProbability };
      for (const branch of before.outcomes) {
        if (branch.state.stability <= 0) {
          distribution.unresolvedProbability += branch.probability;
          continue;
        }
        const after = applySkillOutcomes(
          branch.state,
          skill,
          config,
          effects,
          targetCompletion,
          node.condition,
          targetPerfection,
          64,
        );
        distribution.probabilityUncertain ||= after.probabilityUncertain;
        distribution.unresolvedProbability +=
          branch.probability * after.unresolvedProbability;
        for (const o of after.outcomes)
          distribution.outcomes.push({
            state: o.state,
            probability: branch.probability * o.probability,
          });
        // An action illegal on a pre-use branch cannot be assumed to execute.
        if (
          !after.outcomes.length &&
          after.unresolvedProbability === 0 &&
          before.outcomes.length > 1
        )
          distribution.unresolvedProbability += branch.probability;
      }
      const action: Action = {
        skill,
        children: [],
        unresolved: distribution.unresolvedProbability,
        uncertain: distribution.probabilityUncertain,
        immediate: leaf(node.state),
      };
      const consumes = skill.consumesTurn ?? skill.actionKind !== 'item';
      for (const outcome of distribution.outcomes) {
        if (
          !consumes ||
          reached(outcome.state) ||
          ended(outcome.state) ||
          !conditionRelevant
        ) {
          action.children.push({
            state: outcome.state,
            condition: node.condition,
            queue: node.queue,
            pending: node.pending,
            probability: outcome.probability,
          });
          continue;
        }
        // Preserve each future roll's generation-time harmony, but branch only
        // when that roll becomes visible as the next condition. Earlier queued
        // rolls are then observed and substituted into its exact dependencies.
        const id = outcome.state.step;
        const pending = {
          ...node.pending,
          [id]: {
            current: node.condition,
            queue: node.queue,
            harmony: outcome.state.harmony,
            discordance: getBuffDiscordantConditions(outcome.state.buffs),
          },
        };
        const nextEntry = node.queue[0] ?? id;
        const spec =
          typeof nextEntry === 'number' ? pending[nextEntry] : undefined;
        if (spec?.queue.some((c) => typeof c === 'number'))
          throw new Error('Unobserved condition dependency');
        const generated = spec
          ? generatedConditions(
              spec.current,
              spec.queue as CraftingCondition[],
              spec.harmony,
              spec.discordance,
            )
          : [{ condition: nextEntry as CraftingCondition, probability: 1 }];
        for (const next of generated) {
          const known: Record<number, PendingCondition> = {};
          for (const key of Object.keys(pending)) {
            if (Number(key) === nextEntry) continue;
            const p = pending[Number(key)];
            known[Number(key)] = {
              ...p,
              queue: p.queue.map((c) => (c === nextEntry ? next.condition : c)),
            };
          }
          action.children.push({
            state: outcome.state,
            condition: next.condition,
            queue: node.queue.length ? [...node.queue.slice(1), id] : [],
            pending: known,
            probability: outcome.probability * next.probability,
          });
        }
      }
      if (!action.children.length && action.unresolved === 0) continue;
      action.immediate = combine(
        action,
        action.children.map((child) => leaf(child.state)),
      );
      actions.push(action);
    }
    actions.sort(
      (a, b) =>
        comparePlanningValues(a.immediate, b.immediate) ||
        a.skill.key.localeCompare(b.skill.key),
    );
    transitions.set(key, actions);
    return actions;
  };
  const solve = (node: NodeState, remaining: number): Policy => {
    check();
    if (reached(node.state) || ended(node.state) || remaining <= 0)
      return { value: leaf(node.state) };
    const key = remaining + '|' + stateKey(node),
      cached = memo.get(key);
    if (cached) {
      hits++;
      return cached;
    }
    const all = expand(node);
    if (!all.length)
      return {
        value: {
          ...leaf(node.state),
          prematureEndProbability: 1,
          unresolvedProbability: 0,
        },
      };
    // Retain a representative of each action family, then fill by immediate value.
    const candidates: Action[] = [];
    const families = new Set<string>();
    for (const a of all) {
      const family = a.skill.actionKind === 'item' ? 'item' : a.skill.type;
      if (!families.has(family)) {
        families.add(family);
        candidates.push(a);
      }
    }
    for (const a of all) {
      if (candidates.length >= Math.max(width, families.size)) break;
      if (!candidates.includes(a)) candidates.push(a);
    }
    pruned += all.length - candidates.length;
    let best: Policy | undefined;
    for (const action of candidates) {
      const continuations = action.children.map((child) =>
        solve(child, remaining - 1),
      );
      const value = combine(
        action,
        continuations.map((p) => p.value),
      );
      const likely = action.children.reduce(
        (best, c, i) =>
          c.probability > (action.children[best]?.probability ?? -1) ? i : best,
        0,
      );
      const policy = { value, action, next: continuations[likely] };
      if (!best || comparePlanningValues(value, best.value) < 0) best = policy;
    }
    memo.set(key, best!);
    return best!;
  };
  const root: NodeState = {
    state,
    condition: currentCondition,
    queue: forecast.slice(0, 3),
    pending: {},
  };
  let actions: Action[] = [];
  let policies: Policy[] = [];
  let completed = 0;
  if (!reached(state) && !ended(state)) {
    try {
      actions = expand(root).filter(
        (a) =>
          !settings.rootSkillKeys ||
          settings.rootSkillKeys.includes(a.skill.key),
      );
    } catch (error) {
      if (!(error instanceof SearchBudgetReached)) throw error;
    }
    // Root outcomes must be evaluated for every action before claiming a ranking.
    actions = actions.filter((action) => action.unresolved < 1e-10);
    policies = actions.map((action) => ({ action, value: action.immediate }));
    if (policies.length) completed = 1;
    for (let d = 2; d <= horizon && policies.length; d++) {
      try {
        const next = actions.map((action) => {
          const children = action.children.map((child) => solve(child, d - 1));
          const likely = action.children.reduce(
            (best, c, i) =>
              c.probability > (action.children[best]?.probability ?? -1)
                ? i
                : best,
            0,
          );
          return {
            action,
            value: combine(
              action,
              children.map((p) => p.value),
            ),
            next: children[likely],
          };
        });
        policies = next;
        completed = d;
        if (
          policies.some((p) => p.value.goalProbabilityLowerBound >= 1 - 1e-10)
        )
          break;
      } catch (error) {
        if (!(error instanceof SearchBudgetReached)) throw error;
        break;
      }
    }
  }
  policies.sort(
    (a, b) =>
      comparePlanningValues(a.value, b.value) ||
      a.action!.skill.key.localeCompare(b.action!.skill.key),
  );
  const recommend = (p: Policy): SkillRecommendation => {
    const a = p.action!,
      effects = getConditionEffectsForConfig(config, currentCondition);
    const costs = calculateEffectiveActionCosts(
      state,
      a.skill,
      config.minStability,
      effects,
      config,
    );
    const gains = a.children.reduce(
      (g, o) => ({
        completion:
          g.completion +
          o.probability * (o.state.completion - state.completion),
        perfection:
          g.perfection +
          o.probability * (o.state.perfection - state.perfection),
        stability:
          g.stability + o.probability * (o.state.stability - state.stability),
      }),
      { completion: 0, perfection: 0, stability: 0 },
    );
    if (a.uncertain && a.children.length) {
      gains.completion = Math.min(
        ...a.children.map((c) => c.state.completion - state.completion),
      );
      gains.perfection = Math.min(
        ...a.children.map((c) => c.state.perfection - state.perfection),
      );
      gains.stability = Math.min(
        ...a.children.map((c) => c.state.stability - state.stability),
      );
    }
    return {
      skill: a.skill,
      expectedGains: gains,
      immediateGains: calculateDisplayedSkillGains(
        state,
        a.skill,
        config,
        effects,
        { includeExpectedValue: false },
      ),
      effectiveCosts: { qi: costs.qiCost, stability: costs.stabilityCost },
      score: p.value.goalProbabilityLowerBound,
      planning: { ...p.value, transitionUnresolvedProbability: a.unresolved },
      reasoning:
        p.value.goalProbabilityLowerBound >= 1 - 1e-10
          ? 'Verified route to both selected goals.'
          : a.children.every((c) => ended(c.state))
            ? 'Ends the craft; reaching both selected goals is not guaranteed.'
            : p.value.prematureEndProbability > 1e-10
              ? 'Risk of ending below the selected goals remains in this continuation.'
              : p.value.goalProbabilityLowerBound > 0
                ? 'An evaluated route reaches both goals; other outcomes remain uncertain.'
                : 'Goal route not yet proved within the search budget; this action preserves the evaluated continuation.',
      requiresProbabilisticSurvival: p.value.prematureEndProbability > 1e-10,
      endsCraft: a.unresolved === 0 && a.children.every((c) => ended(c.state)),
      // A horizon lower bound of zero means unproved, not a 0%-success craft.
      projectedSuccessChance:
        p.value.unresolvedProbability <= 1e-10 && !a.uncertain
          ? p.value.goalProbabilityLowerBound
          : undefined,
    };
  };
  const outcome = classifyOutcome(state, goals.bands);
  const bar = (value: number, width: number, goal: number) => {
    const counted =
      width > 0
        ? getBonusAndChance(value, width)
        : { guaranteed: 0, bonusChance: 0, nextThreshold: 0 };
    return {
      value,
      bands: counted.guaranteed,
      requiredBands: width > 0 ? getBonusAndChance(goal, width).guaranteed : 0,
      bonusChance: counted.bonusChance,
      nextThreshold: counted.nextThreshold,
      pointsToNextBand: Math.max(0, counted.nextThreshold - value),
    };
  };
  const projection: OutcomeProjection = {
    tier: outcome.tier,
    optimisticTier: outcome.optimisticTier,
    targetTier: goals.bands.targetTier,
    completion: bar(state.completion, targetCompletion, goals.completion),
    perfection: bar(state.perfection, targetPerfection, goals.perfection),
    bindingBar: reached(state)
      ? 'none'
      : (goals.completion > 0 ? state.completion / goals.completion : 1) <
          (goals.perfection > 0 ? state.perfection / goals.perfection : 1)
        ? 'completion'
        : 'perfection',
    willAutoFinish: ended(state),
  };
  const recommendations = policies.map(recommend);
  recommendations.forEach((r, i) => {
    r.qualityRating = Math.round(
      (100 * (recommendations.length - i)) / recommendations.length,
    );
  });
  const rotation: SkillDefinition[] = [];
  let cursor = policies[0];
  while (cursor?.action && rotation.length < horizon) {
    rotation.push(cursor.action.skill);
    cursor = cursor.next!;
  }
  return {
    recommendation: recommendations[0] ?? null,
    alternativeSkills: recommendations.slice(1),
    isTerminal: ended(state),
    targetsMet: reached(state),
    outcomeProjection: projection,
    optimalRotation: rotation.map((s) => s.name),
    optimalRotationLabels: rotation.map(techniqueDisplayName),
    blockedReasons: recommendations.length
      ? undefined
      : getBlockedSkillReasons(state, config, currentCondition),
    searchMetrics: {
      nodesExplored: nodes,
      cacheHits: hits,
      timeTakenMs: Date.now() - started,
      depthReached: completed,
      pruned,
    },
  };
}

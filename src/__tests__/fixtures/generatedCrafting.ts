import { CraftingState } from '../../optimizer/state';
import { retargetConfig, retargetSkill } from './runtime0717';

/** Stable LCG: a failing seed is a complete, portable reproduction. */
export function seededRandom(seed: number): () => number {
  let value = seed >>> 0;
  return () =>
    (value = (Math.imul(value, 1664525) + 1013904223) >>> 0) / 0x100000000;
}

export interface SimpleAction {
  key: string;
  qi: number;
  cost: number;
  completion: number;
  perfection: number;
  recovery: number;
  chance: number;
}
export interface SimpleState {
  qi: number;
  stability: number;
  completion: number;
  perfection: number;
}

export function generatedCraft(seed: number, strength: number) {
  const random = seededRandom(seed);
  const integer = (low: number, high: number) =>
    low + Math.floor(random() * (high - low + 1));
  const intensity = Math.floor(integer(8, 25) * strength);
  const control = Math.floor(integer(8, 25) * strength);
  const recipe = { completion: integer(20, 60), perfection: integer(20, 60) };
  const maximum = integer(3, 5);
  const start: SimpleState = {
    qi: integer(15, 40),
    stability: maximum,
    completion: 0,
    perfection: 0,
  };
  const actions: SimpleAction[] = [
    {
      key: 'balanced',
      qi: integer(2, 5),
      cost: 1,
      completion: intensity,
      perfection: control,
      recovery: 0,
      chance: 1,
    },
    {
      key: 'fusion',
      qi: integer(1, 4),
      cost: 1,
      completion: intensity * 2,
      perfection: 0,
      recovery: 0,
      chance: 1,
    },
    {
      key: 'refine',
      qi: integer(1, 4),
      cost: 1,
      completion: 0,
      perfection: control * 2,
      recovery: 0,
      chance: 1,
    },
    {
      key: 'gamble',
      qi: integer(2, 5),
      cost: 2,
      completion: intensity * 3,
      perfection: control * 3,
      recovery: 0,
      chance: 0.5,
    },
    {
      key: 'restore',
      qi: integer(6, 10),
      cost: 0,
      completion: 0,
      perfection: 0,
      recovery: 2,
      chance: 1,
    },
  ];
  const skills = actions.map((a) =>
    retargetSkill({
      key: a.key,
      name: a.key,
      type:
        a.key === 'fusion'
          ? 'fusion'
          : a.key === 'refine'
            ? 'refine'
            : a.key === 'restore'
              ? 'stabilize'
              : 'support',
      qiCost: a.qi,
      stabilityCost: a.cost,
      successChance: a.chance,
      preventsMaxStabilityDecay: true,
      effects: [
        { kind: 'completion', amount: { value: a.completion } },
        { kind: 'perfection', amount: { value: a.perfection } },
        { kind: 'stability', amount: { value: a.recovery } },
      ],
    }),
  );
  const config = retargetConfig(skills[0], {
    skills,
    maxQi: start.qi,
    maxStability: maximum,
    baseIntensity: intensity,
    baseControl: control,
    maxCompletion: recipe.completion,
    maxPerfection: recipe.perfection,
    targetCompletion: recipe.completion,
    targetPerfection: recipe.perfection,
  });
  return {
    seed,
    strength,
    recipe,
    maximum,
    start,
    actions,
    config,
    state: new CraftingState({ ...start, initialMaxStability: maximum }),
  };
}

/** Independent finite-state oracle for this deliberately small mechanics subset.
 * It never imports the simulator, planner, caches or scoring functions. */
export function simpleOracle(craft: ReturnType<typeof generatedCraft>) {
  const { recipe, maximum, actions } = craft;
  const goal = (s: SimpleState) =>
    s.completion >= recipe.completion && s.perfection >= recipe.perfection;
  const terminal = (s: SimpleState) => s.stability <= 0 || goal(s);
  const children = (s: SimpleState, a: SimpleAction) =>
    [false, true].flatMap((success) => {
      const probability = success ? a.chance : 1 - a.chance;
      return probability > 0
        ? [
            {
              probability,
              state: {
                qi: s.qi - a.qi,
                stability: Math.max(
                  0,
                  Math.min(
                    maximum,
                    s.stability - a.cost + (success ? a.recovery : 0),
                  ),
                ),
                completion: Math.min(
                  recipe.completion,
                  s.completion + (success ? a.completion : 0),
                ),
                perfection: Math.min(
                  recipe.perfection,
                  s.perfection + (success ? a.perfection : 0),
                ),
              },
            },
          ]
        : [];
    });
  const memo = new Map<string, number>();
  const value = (s: SimpleState, depth: number): number => {
    if (goal(s)) return 1;
    if (terminal(s) || depth <= 0) return 0;
    const key = JSON.stringify([s, depth]);
    const cached = memo.get(key);
    if (cached !== undefined) return cached;
    const best = Math.max(
      0,
      ...actions
        .filter((a) => s.qi >= a.qi)
        .map((a) => actionValue(s, a, depth)),
    );
    memo.set(key, best);
    return best;
  };
  const actionValue = (
    s: SimpleState,
    a: SimpleAction,
    depth: number,
  ): number =>
    children(s, a).reduce(
      (sum, child) => sum + child.probability * value(child.state, depth - 1),
      0,
    );
  return { goal, terminal, children, value, actionValue };
}

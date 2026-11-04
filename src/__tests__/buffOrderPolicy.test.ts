import { CraftingState } from '../optimizer/state';
import { applySkillOutcomes } from '../optimizer/skills';
import { findBestSkill } from '../optimizer/search';
import type { BuffDefinition } from '../optimizer/gameTypes';
import { retargetConfig, retargetSkill } from './fixtures/runtime0717';

test.each([false, true])(
  'opposite buff insertion orders cannot share a certified continuation (reverse names: %s)',
  (reverse) => {
    const restore: BuffDefinition = {
      name: reverse ? 'Z' : 'A',
      canStack: false,
      effects: [],
      onFusion: [{ kind: 'pool', amount: { value: 20 } }],
    };
    const spend: BuffDefinition = {
      name: reverse ? 'A' : 'Z',
      canStack: false,
      effects: [],
      onFusion: [{ kind: 'pool', amount: { value: -20 } }],
    };
    const setup = retargetSkill({
      key: 'setup',
      type: 'support',
      qiCost: 0,
      stabilityCost: 1,
      cooldown: 20,
      preventsMaxStabilityDecay: true,
      effects: [
        {
          kind: 'createBuff',
          buff: restore,
          stacks: { value: 1 },
          condition: { kind: 'chance', percentage: 50 },
        },
        { kind: 'createBuff', buff: spend, stacks: { value: 1 } },
        { kind: 'createBuff', buff: restore, stacks: { value: 1 } },
      ],
    });
    const fusion = retargetSkill({
      key: 'fusion',
      type: 'fusion',
      qiCost: 0,
      stabilityCost: 1,
      cooldown: 20,
      preventsMaxStabilityDecay: true,
    });
    const finish = retargetSkill({
      key: 'finish',
      type: 'support',
      qiCost: 95,
      stabilityCost: 1,
      preventsMaxStabilityDecay: true,
      effects: [{ kind: 'completion', amount: { value: 100 } }],
    });
    const config = retargetConfig(setup, {
      skills: [setup, fusion, finish],
      maxQi: 100,
      maxCompletion: 100,
      maxPerfection: 0,
    });
    const state = new CraftingState({
      qi: 95,
      stability: 3,
      cooldowns: new Map([
        ['fusion', 1],
        ['finish', 2],
      ]),
    });
    const branches = applySkillOutcomes(
      state,
      setup,
      config,
      [],
      100,
      'neutral',
      0,
    );
    expect(branches.unresolvedProbability).toBe(0);
    expect(branches.outcomes).toHaveLength(2);
    const pools = branches.outcomes
      .map(
        ({ state: child }) =>
          applySkillOutcomes(child, fusion, config, [], 100, 'neutral', 0)
            .outcomes[0].state.qi,
      )
      .sort((a, b) => a - b);
    expect(pools).toEqual([80, 95]);
    const result = findBestSkill(
      state,
      config,
      100,
      0,
      false,
      3,
      'neutral',
      ['neutral', 'neutral', 'neutral'],
      { timeBudgetMs: 60000, maxNodes: 5000 },
    );
    expect(result.recommendation?.skill.key).toBe('setup');
    expect(
      result.recommendation?.planning?.goalProbabilityLowerBound,
    ).toBeCloseTo(0.5);
    expect(
      result.recommendation?.planning?.prematureEndProbability,
    ).toBeCloseTo(0.5);
    expect(result.expectedFinalState).toBeUndefined();
  },
);

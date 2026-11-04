// Adapted from upstream v7.0.0 survivabilityFloor.test.ts (#22) and resource
// application regressions (#21). The fork asserts discrete outcomes, not EV
// states, as its certificate authority. Upstream commit: a2a2a18.
import { CraftingState } from '../optimizer/state';
import {
  applySkill,
  applySkillOutcomes,
  calculateActionSurvivabilityFloor,
} from '../optimizer/skills';
import type { BuffDefinition } from '../optimizer/gameTypes';
import { retargetConfig, retargetSkill } from './fixtures/runtime0717';

test('upstream: consume a payment discount before computing stability payment', () => {
  const ward: BuffDefinition = {
    name: 'Payment ward',
    canStack: false,
    effects: [],
    stats: { stabilityCostReduction: { value: 100 } },
  };
  const state = new CraftingState({
    qi: 100,
    stability: 1,
    buffs: new Map([
      ['payment_ward', { name: ward.name, stacks: 1, definition: ward }],
    ]),
  });
  const skill = retargetSkill({
    qiCost: 0,
    stabilityCost: 10,
    buffCost: { buffName: 'payment_ward', consumeAll: true },
    effects: [{ kind: 'completion', amount: { value: 1 } }],
  });
  expect(
    calculateActionSurvivabilityFloor(state, skill, retargetConfig(skill)),
  ).toEqual({ stability: 0, maxStability: 59, survivalProbability: 0 });
});

test.each([100, 50])(
  'upstream: %s%% recovery mastery precedes payment',
  (percentage) => {
    const state = new CraftingState({ qi: 100, stability: 1 });
    const skill = retargetSkill({
      qiCost: 0,
      stabilityCost: 10,
      masteryEntries: [
        {
          kind: 'effect',
          condition: { kind: 'chance', percentage },
          effects: [{ kind: 'stability', amount: { value: 25 } }],
        },
      ],
    });
    expect(
      calculateActionSurvivabilityFloor(state, skill, retargetConfig(skill)),
    ).toEqual({
      stability: percentage === 100 ? 16 : 0,
      maxStability: 59,
      survivalProbability: percentage / 100,
    });
  },
);

test.each([0, 0.25, 0.75, 1])(
  'upstream: one success roll couples beneficial and harmful effects (%s)',
  (successChance) => {
    const state = new CraftingState({ qi: 100, stability: 1 });
    const skill = retargetSkill({
      qiCost: 0,
      stabilityCost: 10,
      successChance,
      effects: [
        { kind: 'stability', amount: { value: 20 } },
        { kind: 'stability', amount: { value: -20 } },
      ],
    });
    expect(
      calculateActionSurvivabilityFloor(state, skill, retargetConfig(skill)),
    ).toMatchObject({ stability: 0, survivalProbability: 0 });
  },
);

test('upstream: signed maximum repair survives an equal subsequent maximum loss', () => {
  const drain: BuffDefinition = {
    name: 'Maximum drain',
    canStack: false,
    effects: [{ kind: 'maxStability', amount: { value: -10 } }],
  };
  const state = new CraftingState({
    qi: 100,
    stability: 8,
    initialMaxStability: 10,
    buffs: new Map([
      ['maximum_drain', { name: drain.name, stacks: 1, definition: drain }],
    ]),
  });
  const skill = retargetSkill({
    qiCost: 0,
    stabilityCost: 0,
    effects: [{ kind: 'maxStability', amount: { value: 10 } }],
  });
  const outcome = applySkillOutcomes(state, skill, retargetConfig(skill));
  expect(outcome.unresolvedProbability).toBe(0);
  expect(outcome.outcomes[0].state.stability).toBe(8);
  expect(outcome.outcomes[0].state.maxStability).toBe(9);
});

test('native maximum penalty rounds only at concrete turn cleanup', () => {
  const skill = retargetSkill({
    qiCost: 0,
    stabilityCost: 0,
    effects: [{ kind: 'maxStability', amount: { value: -1.2 } }],
  });
  const state = new CraftingState({
    qi: 100,
    stability: 10,
    initialMaxStability: 10,
  });
  const result = applySkillOutcomes(state, skill, retargetConfig(skill));
  expect(result.outcomes[0].state.stabilityPenalty).toBe(3);
  expect(result.outcomes[0].state.stability).toBe(7);
});

test.each(['technique', 'buff'] as const)(
  'native signed stability modifiers apply to a %s loss',
  (source) => {
    const drain = { kind: 'stability' as const, amount: { value: -10 } };
    const buff: BuffDefinition = {
      name: 'Drain',
      canStack: false,
      effects: [drain],
    };
    const state = new CraftingState({
      qi: 100,
      stability: 20,
      stabilityCostReduction: 50,
      buffs:
        source === 'buff'
          ? new Map([
              ['drain', { name: buff.name, stacks: 1, definition: buff }],
            ])
          : new Map(),
    });
    const skill = retargetSkill({
      qiCost: 0,
      stabilityCost: 0,
      effects: source === 'technique' ? [drain] : [],
    });
    expect(
      applySkillOutcomes(state, skill, retargetConfig(skill)).outcomes[0].state
        .stability,
    ).toBe(15);
  },
);

test('deterministic preview resource listeners retain immediate capped deltas', () => {
  const listener: BuffDefinition = {
    name: 'Pool listener',
    canStack: false,
    effects: [],
    triggeredEffects: [
      {
        trigger: 'poolRestored',
        effects: [{ kind: 'pool', amount: { value: -20 } }],
      },
    ],
  };
  const state = new CraftingState({
    qi: 95,
    stability: 20,
    buffs: new Map([
      [
        'pool_listener',
        { name: listener.name, stacks: 1, definition: listener },
      ],
    ]),
  });
  const skill = retargetSkill({
    qiCost: 0,
    stabilityCost: 0,
    effects: [
      { kind: 'pool', amount: { value: 20 } },
      { kind: 'pool', amount: { value: 20 } },
    ],
  });
  const config = retargetConfig(skill, { maxQi: 100 });
  expect(applySkill(state, skill, config)?.qi).toBe(80);
  expect(applySkillOutcomes(state, skill, config).outcomes[0].state.qi).toBe(
    80,
  );
});

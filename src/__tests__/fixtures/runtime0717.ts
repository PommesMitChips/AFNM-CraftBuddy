import { BuffType, CraftingState } from '../../optimizer/state';
import type { BuffDefinition } from '../../optimizer/gameTypes';
import type { OptimizerConfig, SkillDefinition } from '../../optimizer/skills';

export function retargetSkill(
  overrides: Partial<SkillDefinition> = {},
): SkillDefinition {
  return {
    name: 'Retarget probe',
    key: 'retarget_probe',
    type: 'refine',
    qiCost: 10,
    stabilityCost: 3,
    baseCompletionGain: 0,
    basePerfectionGain: 0,
    stabilityGain: 0,
    maxStabilityChange: 0,
    buffType: BuffType.NONE,
    buffDuration: 0,
    buffMultiplier: 1,
    ...overrides,
  };
}

export function retargetConfig(
  skill: SkillDefinition,
  overrides: Partial<OptimizerConfig> = {},
): OptimizerConfig {
  return {
    maxQi: 200,
    maxStability: 60,
    baseControl: 10,
    baseIntensity: 10,
    minStability: 0,
    skills: [skill],
    maxToxicity: 100,
    defaultBuffMultiplier: 1.4,
    targetCompletion: 100,
    targetPerfection: 100,
    ...overrides,
  };
}

export const jade: BuffDefinition = {
  name: 'Converging Jade Cauldron',
  canStack: false,
  effects: [],
  onFusion: [{ kind: 'negate' }],
  triggeredEffects: [
    {
      trigger: 'perfectionGained',
      effects: [
        { kind: 'completion', amount: { value: 30, eqn: 'amount / 100' } },
      ],
    },
  ],
};

export function retargetScenarios(): Array<{
  name: string;
  state: CraftingState;
  skill: SkillDefinition;
  config: OptimizerConfig;
}> {
  const scenarios: ReturnType<typeof retargetScenarios> = [];
  const add = (
    name: string,
    state: CraftingState,
    skill: SkillDefinition,
    config: Partial<OptimizerConfig> = {},
  ) => {
    scenarios.push({
      name,
      state,
      skill,
      config: retargetConfig(skill, config),
    });
  };
  for (const percentage of [0, 20, 100]) {
    add(
      `0717-fairy-payment-${percentage}`,
      new CraftingState({ qi: 39, stability: 50 }),
      retargetSkill({
        qiCost: 23,
        stabilityCost: 23,
        masteryEntries: [
          {
            kind: 'effect',
            effects: [
              {
                kind: 'createBuff',
                stacks: { value: 1 },
                buff: {
                  name: 'Energising (10%)',
                  canStack: true,
                  effects: [],
                  stats: {
                    qiCostReduction: { value: 10 },
                    stabilityCostReduction: { value: 10 },
                  },
                },
              },
            ],
          },
          {
            kind: 'effect',
            effects: [
              {
                kind: 'createBuff',
                condition: { kind: 'chance', percentage },
                stacks: { value: 5 },
                buff: {
                  name: 'Energising Enhancement',
                  canStack: true,
                  effects: [{ kind: 'addStack', stacks: { value: -1 } }],
                  stats: {
                    qiCostReduction: { value: 10 },
                    stabilityCostReduction: { value: 10 },
                  },
                },
              },
            ],
          },
        ],
      }),
    );
  }
  const paymentSkill = scenarios.find(
    (entry) => entry.name === '0717-fairy-payment-20',
  )!.skill;
  add(
    '0717-independent-payment-chances',
    new CraftingState({ qi: 39, stability: 50 }),
    {
      ...paymentSkill,
      masteryEntries: [
        ...paymentSkill.masteryEntries!,
        {
          kind: 'effect',
          condition: { kind: 'chance', percentage: 50 },
          effects: [
            {
              kind: 'createBuff',
              stacks: { value: 5 },
              buff: {
                name: 'Second discount',
                canStack: true,
                effects: [],
                stats: {
                  qiCostReduction: { value: 10 },
                  stabilityCostReduction: { value: 10 },
                },
              },
            },
          ],
        },
      ],
    },
  );
  add(
    '0717-cost-channels',
    new CraftingState({
      qi: 200,
      stability: 60,
      qiCostReduction: 10,
      qiCostPenalty: 10,
      stabilityCostReduction: 20,
      buffs: new Map([
        [
          'first',
          {
            name: 'first',
            stacks: 3,
            definition: {
              name: 'First',
              canStack: true,
              effects: [],
              stats: {
                qiCostReduction: { value: 20 },
                qiCostPenalty: { value: 25 },
                stabilityCostReduction: { value: 25 },
                stabilityCostPenalty: { value: 25 },
              },
            },
          },
        ],
        [
          'second',
          {
            name: 'second',
            stacks: 1,
            definition: {
              name: 'Second',
              canStack: true,
              effects: [],
              stats: {
                qiCostReduction: { value: 50 },
                qiCostPenalty: { value: 20 },
              },
            },
          },
        ],
      ]),
    }),
    retargetSkill({ qiCost: 100, stabilityCost: 20 }),
  );
  add(
    '0717-mastery-before-cost-failed',
    new CraftingState({
      qi: 100,
      stability: 50,
      qiDroplets: 3,
      buffs: new Map([
        [
          'discount',
          {
            name: 'discount',
            stacks: 1,
            definition: {
              name: 'Discount',
              canStack: true,
              effects: [],
              stats: { qiCostReduction: { value: 50 } },
            },
          },
        ],
      ]),
      harmonyData: {
        recommendedTechniqueTypes: [],
        enhancingEcho: { attunedType: 'refine' },
      },
    }),
    retargetSkill({
      successChance: 0,
      toxicityCost: 5,
      dropletCost: 3,
      buffCost: { buffName: 'discount', amount: 1 },
      masteryEntries: [
        {
          kind: 'effect',
          effects: [
            {
              kind: 'createBuff',
              stacks: { value: 2 },
              buff: {
                name: 'Mastery surcharge',
                canStack: true,
                stats: {
                  qiCostPenalty: {
                    value: 100,
                    eqn: 'toxicity / 5 + (3 - qiDroplets)',
                  },
                },
                effects: [{ kind: 'addStack', stacks: { value: -1 } }],
              },
            },
          ],
        },
      ],
      effects: [{ kind: 'completion', amount: { value: 100 } }],
    }),
    { isSublimeCraft: true, craftingType: 'enhancingEcho' },
  );
  add(
    '0717-jade',
    new CraftingState({
      qi: 100,
      stability: 50,
      buffs: new Map([
        ['jade', { name: 'jade', stacks: 1, definition: jade }],
        [
          'boost',
          {
            name: 'boost',
            stacks: 1,
            definition: {
              name: 'Boost',
              canStack: false,
              effects: [],
              stats: { completionBoost: { value: 100 } },
            },
          },
        ],
      ]),
    }),
    retargetSkill({
      effects: [{ kind: 'perfection', amount: { value: 100 } }],
    }),
  );
  add(
    '0717-trigger-cycle',
    new CraftingState({
      qi: 100,
      stability: 50,
      buffs: new Map([
        [
          'cycle',
          {
            name: 'cycle',
            stacks: 1,
            definition: {
              name: 'Cycle',
              canStack: false,
              effects: [],
              triggeredEffects: [
                {
                  trigger: 'perfectionGained',
                  effects: [{ kind: 'completion', amount: { value: 30 } }],
                },
                {
                  trigger: 'completionGained',
                  effects: [{ kind: 'perfection', amount: { value: 1 } }],
                },
              ],
            },
          },
        ],
      ]),
    }),
    retargetSkill({
      effects: [{ kind: 'perfection', amount: { value: 100 } }],
    }),
  );
  for (const name of ['Fusion Invasion', 'Refinement Invasion']) {
    const definition: BuffDefinition = {
      name,
      canStack: true,
      stats: { intensity: { value: -2 } },
      effects: [{ kind: 'addStack', stacks: { value: -1 } }],
    };
    const key = name.toLowerCase().replace(/ /g, '_');
    add(
      `0717-${key}`,
      new CraftingState({
        qi: 100,
        stability: 50,
        buffs: new Map([[key, { name: key, stacks: 2, definition }]]),
      }),
      retargetSkill({
        effects: [
          { kind: 'completion', amount: { value: 1, stat: 'intensity' } },
          { kind: 'createBuff', buff: definition, stacks: { value: 2 } },
        ],
      }),
    );
  }
  add(
    '0717-stablizing-circuit',
    new CraftingState({
      qi: 100,
      stability: 50,
      qiDroplets: 3,
      maxQiDroplets: 6,
    }),
    retargetSkill({
      name: 'Stablizing Circuit',
      key: 'stablizing_circuit',
      type: 'stabilize',
      qiCost: 0,
      stabilityCost: 0,
      dropletCost: 3,
      cooldown: 9999999,
      effects: [
        {
          kind: 'createBuff',
          stacks: { value: 1 },
          buff: {
            name: 'Circuit',
            canStack: false,
            initialState: {
              fusion: '1',
              refine: '1',
              stabilize: '1',
              support: '1',
            },
            onStabilize: [
              {
                kind: 'setState',
                key: 'fusion',
                keys: ['refine', 'stabilize', 'support'],
                value: { value: 0 },
              },
            ],
            effects: [],
          },
        },
      ],
    }),
  );
  add(
    '0717-chance-mastery-as-is',
    new CraftingState({ qi: 100, stability: 50 }),
    retargetSkill({
      successChance: 0,
      masteryEntries: [
        {
          kind: 'effect',
          condition: { kind: 'chance', percentage: 10 },
          effects: [{ kind: 'completion', amount: { value: 300 } }],
        },
      ],
      effects: [{ kind: 'perfection', amount: { value: 100 } }],
    }),
  );
  add(
    '0717-fractional-cost-channels',
    new CraftingState({
      qi: 500,
      stability: 500,
      initialMaxStability: 600,
      qiCostReduction: 15.5,
      stabilityCostReduction: 15.5,
      buffs: new Map([
        [
          'discount',
          {
            name: 'discount',
            stacks: 1,
            definition: {
              name: 'Discount',
              canStack: false,
              effects: [],
              stats: {
                qiCostReduction: { value: 10 },
                stabilityCostReduction: { value: 10 },
              },
            },
          },
        ],
      ]),
    }),
    retargetSkill({ qiCost: 200, stabilityCost: 200 }),
    { maxQi: 600, maxStability: 600 },
  );
  add(
    '0717-jade-bifang',
    new CraftingState({
      qi: 100,
      stability: 50,
      completion: 90,
      buffs: new Map([
        ['jade', { name: 'jade', stacks: 1, definition: jade }],
        [
          'true_bifang_flame',
          {
            name: 'True Bifang Flame',
            stacks: 1,
            internalState: { blaze: 0 },
            definition: {
              name: 'True Bifang Flame',
              canStack: false,
              effects: [],
              stats: {
                control: { value: 0.03, stat: 'control', scaling: 'blaze' },
              },
              initialState: { blaze: '0' },
              triggeredEffects: [
                {
                  trigger: 'completionGained',
                  effects: [
                    {
                      kind: 'setState',
                      key: 'blaze',
                      value: {
                        value: 1,
                        eqn: 'max(blaze, floor(percentGained))',
                      },
                    },
                  ],
                },
              ],
            },
          },
        ],
      ]),
    }),
    retargetSkill({
      effects: [
        { kind: 'perfection', amount: { value: 10 } },
        { kind: 'perfection', amount: { value: 100 } },
      ],
    }),
  );
  // Runtime G:275603: Calming Mind Pill grants 4 isItem-scaled stacks,
  // stabilityCostReduction 15, ordinary decay -1. Neutral effectiveness is 0.
  for (const effectiveness of [0, 50, -50]) {
    add(
      `0717-calming-mind-${effectiveness}`,
      new CraftingState({
        qi: 100,
        stability: 50,
        itemEffectiveness: effectiveness,
        items: new Map([['calming_mind_pill', 1]]),
      }),
      retargetSkill({
        name: 'Calming Mind Pill',
        key: 'calming_mind_pill',
        itemName: 'Calming Mind Pill',
        type: 'support',
        actionKind: 'item',
        consumesTurn: false,
        qiCost: 0,
        stabilityCost: 0,
        effects: [
          {
            kind: 'createBuff',
            stacks: { value: 4, isItem: true },
            buff: {
              name: 'Calming Mind Pill',
              canStack: true,
              stats: { stabilityCostReduction: { value: 15 } },
              effects: [{ kind: 'addStack', stacks: { value: -1 } }],
            },
          },
        ],
      }),
    );
  }
  return scenarios;
}

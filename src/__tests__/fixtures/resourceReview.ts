import { CraftingState } from '../../optimizer/state';
import type { BuffDefinition } from '../../optimizer/gameTypes';
import { retargetConfig, retargetSkill } from './runtime0717';

export function resourceReviewScenarios() {
  const listener: BuffDefinition = {
    name: 'Listener',
    canStack: false,
    effects: [],
    triggeredEffects: [
      {
        trigger: 'completionGained',
        effects: [{ kind: 'pool', amount: { value: 20 } }],
      },
    ],
  };
  const restore: BuffDefinition = {
    name: 'Restore',
    canStack: false,
    effects: [{ kind: 'pool', amount: { value: 40 } }],
  };
  const drain: BuffDefinition = {
    name: 'Drain',
    canStack: false,
    effects: [{ kind: 'maxStability', amount: { value: -10 } }],
  };
  return [
    {
      name: 'review-triggered-mastery-qi-cap',
      definition: listener,
      skill: retargetSkill({
        qiCost: 10,
        stabilityCost: 0,
        masteryEntries: [
          {
            kind: 'effect',
            effects: [{ kind: 'completion', amount: { value: 1 } }],
          },
        ],
      }),
      initialMaxStability: 60,
    },
    {
      name: 'review-post-technique-qi-cap',
      definition: restore,
      skill: retargetSkill({
        qiCost: 0,
        stabilityCost: 0,
        effects: [
          {
            kind: 'createBuff',
            stacks: { value: 1 },
            buff: {
              name: 'Capacity',
              canStack: false,
              effects: [],
              stats: { maxpool: { value: 50 } },
            },
          },
        ],
      }),
      initialMaxStability: 60,
    },
    {
      name: 'review-signed-maximum-repair',
      definition: drain,
      skill: retargetSkill({
        qiCost: 0,
        stabilityCost: 0,
        effects: [{ kind: 'maxStability', amount: { value: 10 } }],
      }),
      initialMaxStability: 10,
    },
  ].map(({ name, definition, skill, initialMaxStability }) => ({
    name,
    state: new CraftingState({
      qi: 95,
      stability: 8,
      initialMaxStability,
      buffs: new Map([
        [
          definition.name.toLowerCase(),
          { name: definition.name, stacks: 1, definition },
        ],
      ]),
    }),
    config: retargetConfig(skill, { maxQi: 100 }),
  }));
}

import { CraftingState } from '../optimizer/state';
import { applySkill } from '../optimizer/skills';
import {
  buildConfigSnapshot,
  buildStateSnapshot,
  reviveConfigSnapshot,
  reviveStateSnapshot,
} from '../modContent/replaySnapshot';
import { retargetConfig, retargetSkill } from './fixtures/runtime0717';

describe('0.7.17 replay boundary', () => {
  it('separates legacy flattened masteries using the saved native effect tree', () => {
    const base = { kind: 'completion' as const, amount: { value: 10 } };
    const mastery = { kind: 'completion' as const, amount: { value: 30 } };
    const skill = retargetSkill({
      effects: [base, mastery],
      masteryEntries: [{ kind: 'effect', effects: [mastery] }],
      nativeTechnique: { effects: [base] },
    });
    const config = reviveConfigSnapshot({ ...retargetConfig(skill) });
    expect(config.skills[0].effects).toEqual([base]);
    expect(config.skills[0].masteryEntries).toEqual(skill.masteryEntries);
    const result = applySkill(
      new CraftingState({ qi: 100, stability: 50 }),
      config.skills[0],
      config,
    )!;
    expect(result.completion).toBe(40);
  });

  it('round-trips separated effects, droplets, cost channels and per-instance state', () => {
    const skill = retargetSkill({
      noQiCost: true,
      dropletCost: 3,
      effects: [{ kind: 'completion', amount: { value: 7 } }],
      nativeTechnique: { effects: [] },
    });
    const config = reviveConfigSnapshot(
      buildConfigSnapshot(retargetConfig(skill)),
    );
    expect(config.skills[0]).toMatchObject({
      noQiCost: true,
      dropletCost: 3,
      effects: skill.effects,
    });
    const state = new CraftingState({
      qi: 100,
      stability: 50,
      itemEffectiveness: 37.5,
      qiDroplets: 3,
      maxQiDroplets: 6,
      qiCostReduction: 20,
      qiCostPenalty: 25,
      stabilityCostReduction: 30,
      stabilityCostPenalty: 35,
      buffs: new Map([
        [
          'stateful',
          { name: 'stateful', stacks: 1, internalState: { count: 2 } },
        ],
      ]),
    });
    const revived = reviveStateSnapshot(buildStateSnapshot(state, 'missing'));
    expect(revived).toMatchObject({
      itemEffectiveness: 37.5,
      qiDroplets: 3,
      maxQiDroplets: 6,
      qiCostReduction: 20,
      qiCostPenalty: 25,
      stabilityCostReduction: 30,
      stabilityCostPenalty: 35,
    });
    expect(revived.buffs.get('stateful')?.internalState).toEqual({ count: 2 });
  });
});

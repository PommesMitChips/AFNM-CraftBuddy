import { CraftingState } from '../optimizer/state';
import {
  applySkillOutcomes,
  getUnsupportedTransitionReason,
} from '../optimizer/skills';
import { findBestSkill } from '../optimizer/search';
import { initHarmonyData } from '../optimizer/harmony';
import { HARMONY_TYPES } from '../optimizer/harmonyRegistry';
import { bandThreshold } from '../optimizer/outcome';
import { celadonCycle } from './fixtures/celadonCycle';
import { generatedCraft, seededRandom } from './fixtures/generatedCrafting';

const cases = HARMONY_TYPES.flatMap((harmony, i) =>
  [0.5, 1, 2].flatMap((strength) =>
    [false, true].map((celadon) => ({
      harmony,
      strength,
      celadon,
      seed: 100 + i,
    })),
  ),
);

test.each(cases)(
  '$harmony, stats $strength, Celadon $celadon: seeded loadout remains reproducible through replanning',
  ({ harmony, strength, celadon, seed }) => {
    const craft = generatedCraft(seed, strength);
    const random = seededRandom(seed);
    const bands = [2, 4, 8][Math.floor(random() * 3)];
    const config = {
      ...craft.config,
      isSublimeCraft: true,
      craftingType: harmony,
      maxQi: 100 + Math.floor(random() * 200),
      maxStability: 60,
      maxCompletion: bandThreshold(craft.recipe.completion, bands),
      maxPerfection: bandThreshold(craft.recipe.perfection, bands),
      skills: craft.config.skills.filter(
        (s) => s.key !== 'gamble' || seed % 2 === 0,
      ),
    };
    let state = new CraftingState({
      qi: config.maxQi,
      stability: 20 + Math.floor(random() * 41),
      initialMaxStability: 60,
      harmony: harmony === 'formless' ? 33 : 0,
      harmonyData: initHarmonyData(harmony, config.maxQi),
      buffs: celadon
        ? new Map([
            [
              'celadon_cycle',
              { name: celadonCycle.name, stacks: 1, definition: celadonCycle },
            ],
          ])
        : new Map(),
    });
    for (let turn = 0; turn < 4; turn++) {
      const input = JSON.stringify(state, (_, value) =>
        value instanceof Map ? Array.from(value) : value,
      );
      const result = findBestSkill(
        state,
        config,
        craft.recipe.completion,
        craft.recipe.perfection,
        false,
        4,
        'neutral',
        ['neutral', 'neutral', 'neutral'],
        {
          maxNodes: 60,
          timeBudgetMs: 60000,
          beamWidth: 8,
          completionBandCeiling: bands,
          perfectionBandGoal: bands,
        },
      );
      expect(result.searchMetrics!.nodesExplored).toBeLessThanOrEqual(60);
      expect(result.rootEvaluation?.complete).toBe(true);
      expect(
        JSON.stringify(state, (_, value) =>
          value instanceof Map ? Array.from(value) : value,
        ),
      ).toBe(input);
      if (result.isTerminal) break;
      expect(result.recommendation).not.toBeNull();
      const rec = result.recommendation!;
      expect(
        getUnsupportedTransitionReason(state, rec.skill, config),
      ).toBeUndefined();
      const distribution = applySkillOutcomes(
        state,
        rec.skill,
        config,
        [],
        craft.recipe.completion,
        'neutral',
        craft.recipe.perfection,
      );
      expect(distribution.unresolvedProbability).toBe(0);
      expect(distribution.outcomes.length).toBeGreaterThan(0);
      expect(
        distribution.outcomes.reduce((n, o) => n + o.probability, 0),
      ).toBeCloseTo(1);
      // Select a reproducible branch; this is scenario coverage, not an oracle
      // for native harmony correctness (covered by native fixtures separately).
      let roll = random();
      const chosen =
        distribution.outcomes.find((o) => (roll -= o.probability) < 0) ??
        distribution.outcomes[distribution.outcomes.length - 1];
      state = chosen.state;
      expect(Number.isFinite(state.qi)).toBe(true);
      expect(state.qi).toBeGreaterThanOrEqual(0);
      expect(state.stability).toBeGreaterThanOrEqual(0);
      expect(state.stability).toBeLessThanOrEqual(state.maxStability);
    }
  },
);

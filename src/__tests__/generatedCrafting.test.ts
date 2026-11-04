import {
  applySkillOutcomes,
  calculateActionSurvivabilityFloor,
} from '../optimizer/skills';
import { findBestSkill } from '../optimizer/search';
import { generatedCraft, simpleOracle } from './fixtures/generatedCrafting';

const cases = Array.from({ length: 20 }, (_, i) => i + 1).flatMap((seed) =>
  [0.5, 1, 2].map((strength) => ({ seed, strength })),
);

test.each(cases)(
  'seed $seed, stat strength $strength: transitions and certificates agree with independent exhaustive oracle',
  ({ seed, strength }) => {
    const craft = generatedCraft(seed, strength);
    const oracle = simpleOracle(craft);
    for (const [index, action] of Array.from(craft.actions.entries())) {
      const distribution = applySkillOutcomes(
        craft.state,
        craft.config.skills[index],
        craft.config,
        [],
        craft.recipe.completion,
        'neutral',
        craft.recipe.perfection,
      );
      expect(distribution.unresolvedProbability).toBe(0);
      const expected = oracle.children(craft.start, action);
      expect(distribution.outcomes).toHaveLength(expected.length);
      for (let i = 0; i < expected.length; i++) {
        expect(distribution.outcomes[i].probability).toBe(
          expected[i].probability,
        );
        expect(distribution.outcomes[i].state).toMatchObject(expected[i].state);
      }
      const floor = calculateActionSurvivabilityFloor(
        craft.state,
        craft.config.skills[index],
        craft.config,
        [],
        'neutral',
      );
      expect(floor?.stability).toBe(
        Math.min(...expected.map((o) => o.state.stability)),
      );
      expect(floor?.survivalProbability).toBe(
        expected.reduce(
          (n, o) => n + (o.state.stability > 0 ? o.probability : 0),
          0,
        ),
      );
    }
    const depth = 4;
    const result = findBestSkill(
      craft.state,
      craft.config,
      craft.recipe.completion,
      craft.recipe.perfection,
      false,
      depth,
      'neutral',
      ['neutral', 'neutral', 'neutral'],
      {
        maxNodes: 1200,
        timeBudgetMs: 60000,
        beamWidth: 8,
        completionBandCeiling: 1,
        perfectionBandGoal: 1,
      },
    );
    expect(result.rootEvaluation?.complete).toBe(true);
    expect(result.searchMetrics!.nodesExplored).toBeLessThanOrEqual(1200);
    const recommendation = result.recommendation!;
    expect(recommendation).toBeDefined();
    const action = craft.actions.find(
      (a) => a.key === recommendation.skill.key,
    )!;
    const bound = recommendation.planning!.goalProbabilityLowerBound;
    expect(bound).toBeGreaterThanOrEqual(0);
    expect(bound).toBeLessThanOrEqual(
      oracle.actionValue(craft.start, action, depth) + 1e-10,
    );
    expect(bound).toBeLessThanOrEqual(oracle.value(craft.start, depth) + 1e-10);
    expect(recommendation.skill.key).not.toBe('restore'); // Full bar, no secondary benefit.
    // Positive control: an implementation that always reports zero confidence
    // cannot pass merely by being pessimistic on every generated case.
    if (
      craft.actions.some(
        (a) =>
          a.chance === 1 &&
          a.completion >= craft.recipe.completion &&
          a.perfection >= craft.recipe.perfection,
      )
    )
      expect(bound).toBe(1);
    if (bound === 1)
      expect(oracle.actionValue(craft.start, action, depth)).toBe(1);
  },
);

import { enumerateDecisions } from '../optimizer/stochastic';
import { applySkillOutcomes } from '../optimizer/skills';
import { findBestSkill } from '../optimizer/search';
import { generatedCraft } from './fixtures/generatedCrafting';

test('deadline stops branch replay without renormalizing unresolved probability', () => {
  let visits = 0;
  const result = enumerateDecisions(
    (resolve) => {
      visits++;
      return resolve('a', 0.5) + resolve('b', 0.5);
    },
    64,
    () => visits >= 3,
  );
  expect(visits).toBe(3);
  expect(result.outcomes).toHaveLength(1);
  expect(result.outcomes[0].probability).toBe(0.25);
  expect(result.unresolvedProbability).toBe(0.75);
});

test('interrupted action enumeration retains all missing mass', () => {
  const c = generatedCraft(1, 1);
  const result = applySkillOutcomes(
    c.state,
    c.config.skills[3],
    c.config,
    [],
    c.recipe.completion,
    'neutral',
    c.recipe.perfection,
    64,
    () => true,
  );
  expect(result.outcomes).toEqual([]);
  expect(result.unresolvedProbability).toBe(1);
});

test.each([1, 10, 100])(
  'node limit %s is a hard work bound and incomplete roots pause',
  (maxNodes) => {
    const c = generatedCraft(1, 0.5);
    const run = () =>
      findBestSkill(
        c.state,
        c.config,
        c.recipe.completion,
        c.recipe.perfection,
        false,
        8,
        'neutral',
        [],
        { maxNodes, timeBudgetMs: 60000 },
      );
    const first = run(),
      second = run();
    expect(first.searchMetrics!.nodesExplored).toBeLessThanOrEqual(maxNodes);
    expect(first.recommendation?.planning).toEqual(
      second.recommendation?.planning,
    );
    expect(first.recommendation?.skill.key).toBe(
      second.recommendation?.skill.key,
    );
    if (!first.rootEvaluation!.complete) {
      expect(first.recommendation).toBeNull();
      expect(first.expectedFinalState).toBeUndefined();
    }
  },
);

test('deadline checks interrupt a costly root distribution before it can be certified', () => {
  const c = generatedCraft(2, 1);
  c.config.skills = [c.config.skills[3]];
  let tick = 0;
  const clock = jest.spyOn(Date, 'now').mockImplementation(() => tick++);
  try {
    const result = findBestSkill(
      c.state,
      c.config,
      c.recipe.completion,
      c.recipe.perfection,
      false,
      8,
      'neutral',
      [],
      { maxNodes: 10000, timeBudgetMs: 3 },
    );
    expect(result.rootEvaluation!.complete).toBe(false);
    expect(result.recommendation).toBeNull();
    expect(result.expectedFinalState).toBeUndefined();
    expect(tick).toBeLessThan(30);
  } finally {
    clock.mockRestore();
  }
});

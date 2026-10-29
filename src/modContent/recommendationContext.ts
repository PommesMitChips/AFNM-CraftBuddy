import type { OptimizerConfig } from '../optimizer';
import type { CraftBuddySettings, getSearchConfig } from '../settings';
import { serializeCanonicalValue } from './craftStateSignature';

/** All user inputs that change a recommendation, including its search budget. */
export function searchSettingsSignature(settings: CraftBuddySettings): string {
  return serializeCanonicalValue({
    lookaheadDepth: settings.lookaheadDepth,
    searchTimeBudgetMs: settings.searchTimeBudgetMs,
    searchMaxNodes: settings.searchMaxNodes,
    searchBeamWidth: settings.searchBeamWidth,
    searchGoalPriorityBias: settings.searchGoalPriorityBias,
    overcraftAmbition: settings.overcraftAmbition,
    perfectionBandGoal: settings.perfectionBandGoal,
    completionBandCeiling: settings.completionBandCeiling,
    optimizerEngine: settings.optimizerEngine,
    searchThreads: settings.searchThreads,
  });
}

/** Cached values are valid only for identical mechanics and objectives. */
export function buildCrossStepCacheScope(
  config: OptimizerConfig,
  targetCompletion: number,
  targetPerfection: number,
  searchConfig: ReturnType<typeof getSearchConfig>,
): string {
  const { transpositionCache: _table, ...search } = searchConfig;
  return serializeCanonicalValue({
    targets: [targetCompletion, targetPerfection],
    config: {
      ...config,
      // This dispatch-only payload includes live cooldown/UI state. The pure
      // skill definition contains the simulator's costs/effects/masteries.
      skills: config.skills.map(
        ({ nativeTechnique: _payload, ...skill }) => skill,
      ),
    },
    search,
  });
}

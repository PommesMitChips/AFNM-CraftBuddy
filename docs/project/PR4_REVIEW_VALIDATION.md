---
title: PR 4 Review Validation
status: active
authoritative: true
owner: craftbuddy-maintainers
game_version: 0.7.18-97c093b
last_verified: 2026-10-29
source_of_truth: src/__tests__/prReviewRegressions.test.ts, src/__tests__/nativeAutoUsePlan.test.ts, docs/project/RUNTIME_EVIDENCE.md
review_cycle_days: 90
related_files:
  - docs/project/MECHANICS_PARITY.md
  - docs/project/OPTIMIZER_DESIGN.md
  - docs/project/RUNTIME_EVIDENCE.md
---

# PR #4 review follow-up

The 26 Cubic findings and two later Revera findings were checked against source and the installed **0.7.18-97c093b** runtime. Five native-selector claims are contradicted by that runtime. The other findings led to fixes, documentation corrections, or explicit pause diagnostics. Review comment IDs below identify the original threads on [PR #4](https://github.com/lemon07r/AFNM-CraftBuddy/pull/4).

## Safety policy retained

Requested completion and perfection remain conjunctive goals. Discrete outcomes and unresolved probability mass remain separate. Unknown immediate transitions are excluded from executable recommendations; the executor's independent veto is unchanged. Exhausting the root budget or filtering unsupported transitions now reports a visible reason, propagated through worker merges. The comparator and its conservative preference against premature endings are unchanged.

Display previews use the same native pre-use branches as the technique transition. Costs and direct stability recovery are shown separately; expected progress still includes triggered buffs and harmony. Weighted preview values are estimates, not policy certificates. These changes do not assert global optimality, feasibility of every goal, or complete runtime parity.

## Finding dispositions

| Review comment | Finding | Disposition and evidence |
| --- | --- | --- |
| 4411971293 | Persisted experimental engine | Migrated to the compatibility value `legacy` on load/save, persisted on load without resetting budgets; MCTS flags disabled. The claimed live MCTS route was already absent: `findBestSkill` always calls `constrainedSearch`. Settings regression covers both migration paths. |
| 4411971300 | Missing satisfied-effects check | Disagree. Native `hEl(fEl(...))` checks active non-stacking createBuff effects, exactly as the existing selector does. Tests cover skipping these and allowing other effects. Broader resource/stack-cap heuristics would diverge from native consumption. |
| 4411971308 | Native rule format | Disagree. Runtime `eR/iho/rho` use `condition/check/value`, not `kind/comparison`. Tests cover legacy, single-row and grouped AND/OR forms. Unsupported conditions stay unresolved. |
| 4411971314 | Accept every pill | Disagree. Native `scu` explicitly requires `pillKind === 'crafting'`. Added extraction coverage rejecting combat pills. |
| 4411971351 | Registry is a keyed object | Disagree. ModAPI exports `recipeConditionEffects: eu`, where `eu` is an array. Regression preserves array order; guessing object enumeration order could change indexed rule meanings. |
| 4411971356 | WASM excluded from development bundles | Gated both IgnorePlugins to production. Developer builds can include the generated reference artifact; production still excludes it and never switches planner. |
| 4411971369 | Old runtime reproduction coordinates | Marked 0.7.10 coordinates historical; added current fingerprint, bundle hash, commands and scoped evidence in Runtime Evidence §19. Fixed nested ASAR lookup separators on Windows. |
| 4411971379 | Presets ignore engine argument | Removed the obsolete parameter/call sites and dead engine-switch handler. Migrated settings use the sole production planner while preserving custom budgets. |
| 4411971389 | Missing current validation report | This report separates current checks from historical 6.8.0 release results. Mechanics Parity links here. |
| 4411971398 | Zero caps inconsistent | Explicit finite zero caps now stay zero in TS/Rust finish bands as in planning goals. Non-finite/absent caps retain fallback behavior. Regression checks goal/terminal agreement. |
| 4411971402 | Nested companion override missing | Signature uses the same top-level then nested `game.gameEvent` fallback as recommendation construction. Regression changes nested companion without advancing the turn. |
| 4411971412 | Stale output in ZIP | Enabled webpack output cleaning for main and worker compilations. Package verification seeds stale output and checks it is removed. |
| 4411971413 | Stability gain includes cost | Direct stability gains now use the gain-preview contract; payment and turn decay are separate. Tests cover spending-only actions and restoration. |
| 4411971420 | Preview ignores native pre-use | Cost and gain previews run on projected pre-technique states; stochastic pre-use previews retain branch weights. Tests cover deterministic and chance-based cost reduction. |
| 4411971427 | All unresolved roots disappear | Added explicit unresolved/budget pause reasons instead of weakening the execution gate. Tests cover empty safe candidate sets, exhausted root budgets, worker merges and executor refusal. |
| 4411971434 | Resistance not aggregated | Disagree. `getCraftingActionVariables` already folds buff stats onto the extracted raw base. Tests cover one-fold resistance and changing resistance between items. Passing an aggregate base would double-count buffs. Runtime condition modifiers do not modify resistance. |
| 4411971439 | Zero pill limit becomes one | Preserved zero through extraction, selector variables, availability and TS/Rust item payment. Added native-plan regression and cross-engine zero-budget corpus case. |
| 4411971446 | Stale five-band finish guidance | Updated the mechanics summary; also removed the leftover shortcut from the Rust reference predicate and added zero-cap/five-band tests. |
| 4411971448 | Signature encoding collisions | Canonical encoding now escapes keys/strings and tags primitive types. Adversarial regressions cover delimiter collisions, types and key-order stability. |
| 4411971451 | Bun lockfile stale | Regenerated with Bun; declared `@types/react` dependency and resolved version are synchronized. Frozen install checked. |
| 4411971458 | Old publishing command | Explicitly labeled the command and Workshop description as historical 6.8.0 release material. This PR has not been published to Workshop. |
| 4411971463 | Combined signature mutations | Split assertions and restore the cost penalty before mutating droplets, so either missing dependency fails independently. |
| 4411971469 | Vague test-selection entry | Listed concrete stochastic, planner, comparator, native-use and review regression suites. |
| 4411971472 | Unconditional audit logging | Removed all three diagnostic console calls. Assertions remain. |
| 4411971478 | Harness version stale | Harness version now matches `6.9.0`. |
| 4411971487 | Authoritative source list incomplete | Added `constrainedPlanner.ts` and `searchBackend.ts` to Optimizer Design metadata. |

## Revera follow-up

Revera completed with a neutral/partial result and two additional findings. Its stated gaps were installed-runtime verification and executable/UI validation; the scoped runtime checks and executable results here address those gaps without claiming a live visual test.

| Review comment | Finding | Disposition and evidence |
| --- | --- | --- |
| 4412064184 | Inert recovery hides risk beyond the horizon | Added a conservative dominance check in shared node expansion, before recursive/root ranking. For full-bar recovery in a time-independent context, every resolved branch must leave the modeled state unchanged except for a turn and non-improving Qi/stability. Conditions, harmony, native item hooks, active buffs, expressions/callbacks, beneficial cooldown changes, and other state changes prevent pruning. This is a sufficient proof for simple inert recovery, not a claim to detect all dominated actions. Tests cover horizons 1/4/96, useful cooldown waits/buffs, and step-dependent effects. The only productive gamble remains marked risky; pruning waste does not certify it as safe. |
| 4412064200 | Goal Priority Bias ignored | Applied the clamped setting only to the secondary average-progress term. The joint minimum progress term and the safety/goal-probability ordering remain ahead of preference. Production-path tests cover -100/0/+100 and ensure a biased unsafe action still loses to a safe continuation. |

The proposed PR version is now **6.9.0** in package metadata, README and the browser harness; this does not rename or replace the already-installed local UAT artifact.

## Validation

Final results on the PR branch, 2026-10-29:

- Full Jest run: **49 suites / 1,088 tests passed** (one complete green run after both Revera fixes). The new review suite contains 31 cases, including native PRD inert-recovery coverage. Earlier red runs reproduced the valid findings and caught a triggered-progress preview regression, which was fixed before this final run.
- Strict TypeScript check passed as part of the final production build.
- Rust: **94 passed, 3 profiling tests intentionally ignored**. Regenerated TS/Rust corpus: **178 scenarios / 1,555 cases**, adding a zero-pill-budget case without changing the preceding cases. Both differential checks passed.
- Production mod/worker and UI harness built successfully at **6.9.0**. Webpack reports its three existing bundle-size warnings. A VM smoke test of the packaged worker chose guaranteed completion over a fatal gamble.
- Seeded stale files in main and worker output were removed by webpack; the ZIP contained no stale probe and worker cleaning preserved its tracked ignore file. Both development configs omit IgnorePlugin; both production configs retain it. A developer WASM build was not claimed.
- Bun frozen installation passed against the regenerated lockfile. Documentation inventory, link, freshness and authority checks passed.
- Seven fixed-node-budget production replays were compared with the reviewed commit `c132693`: recommendations and planning metadata were identical. New targeted regressions establish the intended changes for inert recovery and nonzero priority bias; these replay samples do not prove global quality or optimality.
- Additional legacy-only benchmark (`lookaheadSearch`, `legacy_fast`): **12 contracts passed, 3 failed, 1 fixture has no contract**, identically on the reviewed commit and this revision. Failures are the old exact-pick contracts for `forge-heat-runway-step-2`, `forge-heat-runway-step-3`, and `user-report-overcraft-endgame`. This historical reference benchmark is not production-planner certification; no constant or contract was changed to hide those failures.

Runtime evidence is scoped to the selector, rule schema, resistance fold, item budget, and termination behavior described in [Runtime Evidence §19](RUNTIME_EVIDENCE.md#19-pr-4-native-selector-verification-0718). Live visual/gameplay validation was not repeated. The installed UAT build has not been replaced by this review follow-up.

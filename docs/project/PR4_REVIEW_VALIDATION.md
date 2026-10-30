---
title: PR 4 Review Validation
status: active
authoritative: true
owner: craftbuddy-maintainers
game_version: 0.7.18-97c093b
last_verified: 2026-10-30
source_of_truth: src/__tests__/prReviewRegressions.test.ts, src/__tests__/nativeAutoUsePlan.test.ts, docs/project/RUNTIME_EVIDENCE.md
review_cycle_days: 90
related_files:
  - docs/project/MECHANICS_PARITY.md
  - docs/project/OPTIMIZER_DESIGN.md
  - docs/project/RUNTIME_EVIDENCE.md
---

# PR #4 review follow-up

The first round covered 26 Cubic findings and two Revera findings. Five native-selector claims in that round were contradicted by the installed **0.7.18-97c093b** runtime; the other findings led to fixes, documentation corrections, or explicit pause diagnostics. A second round covered six further Cubic findings and three Revera findings, documented below. Review comment IDs below identify the original threads on [PR #4](https://github.com/lemon07r/AFNM-CraftBuddy/pull/4).

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
| 4412064184 | Inert recovery hides risk beyond the horizon | Added a conservative dominance check in shared node expansion, before recursive/root ranking. For full-bar recovery in a time-independent context, every resolved branch must leave the modeled state unchanged except for a turn and non-improving Qi/stability. Native item hooks, active buffs, expressions/callbacks, condition dependencies and beneficial cooldown changes prevent pruning. The initial proof also excluded sublime/harmony states; the independent-review follow-up below replaces that blanket exclusion with complete harmony-state comparison. This is a sufficient proof for simple inert recovery, not a claim to detect all dominated actions. Tests cover horizons 1/4/96, useful cooldown waits/buffs, and step-dependent effects. The only productive gamble remains marked risky; pruning waste does not certify it as safe. |
| 4412064200 | Goal Priority Bias ignored | Applied the clamped setting only to the secondary average-progress term. The joint minimum progress term and the safety/goal-probability ordering remain ahead of preference. Production-path tests cover -100/0/+100 and ensure a biased unsafe action still loses to a safe continuation. |

The proposed PR version is now **6.9.0** in package metadata, README and the browser harness; this does not rename or replace the already-installed local UAT artifact.

## First-round validation (dbfb996)

Results on the PR branch at commit `dbfb996`, 2026-10-29:

- Full Jest run: **49 suites / 1,088 tests passed** (one complete green run after both Revera fixes). The new review suite contains 31 cases, including native PRD inert-recovery coverage. Earlier red runs reproduced the valid findings and caught a triggered-progress preview regression, which was fixed before this final run.
- Strict TypeScript check passed as part of the final production build.
- Rust: **94 passed, 3 profiling tests intentionally ignored**. Regenerated TS/Rust corpus: **178 scenarios / 1,555 cases**, adding a zero-pill-budget case without changing the preceding cases. Both differential checks passed.
- Production mod/worker and UI harness built successfully at **6.9.0**. Webpack reports its three existing bundle-size warnings. A VM smoke test of the packaged worker chose guaranteed completion over a fatal gamble.
- Seeded stale files in main and worker output were removed by webpack; the ZIP contained no stale probe and worker cleaning preserved its tracked ignore file. Both development configs omit IgnorePlugin; both production configs retain it. A developer WASM build was not claimed.
- Bun frozen installation passed against the regenerated lockfile. Documentation inventory, link, freshness and authority checks passed.
- Seven fixed-node-budget production replays were compared with the reviewed commit `c132693`: recommendations and planning metadata were identical. New targeted regressions establish the intended changes for inert recovery and nonzero priority bias; these replay samples do not prove global quality or optimality.
- Additional legacy-only benchmark (`lookaheadSearch`, `legacy_fast`): **12 contracts passed, 3 failed, 1 fixture has no contract**, identically on the reviewed commit and this revision. Failures are the old exact-pick contracts for `forge-heat-runway-step-2`, `forge-heat-runway-step-3`, and `user-report-overcraft-endgame`. This historical reference benchmark is not production-planner certification; no constant or contract was changed to hide those failures.

Runtime evidence is scoped to the selector, rule schema, resistance fold, item budget, and termination behavior described in [Runtime Evidence §19](RUNTIME_EVIDENCE.md#19-pr-4-native-selector-verification-0718). Live visual/gameplay validation was not repeated. The installed UAT build has not been replaced by this review follow-up.

## Second review round (reviewed head dbfb996)

Eight findings were addressed; the harmony-index suggestion was rejected using fresh installed-runtime evidence. Probability certificates now account for omitted outcomes even when PRD probabilities are hidden, and hidden probability uncertainty propagates through deterministic ancestors and worker transport. The immediate-outcome execution veto and the transitive policy comparator are unchanged. The package remains **6.9.0**.

| Review comment | Finding | Disposition and evidence |
| --- | --- | --- |
| 4412593381 | Recovery documentation too broad | Mechanics Parity now distinguishes provably inert full-bar recovery from useful cooldown waits or buff-granting recovery. |
| 4412593395 | Duplicate worker diagnostics | Merge deduplicates the tuple of reason, skill name and details, preserving distinct explanations. Regression combines repeated empty partitions plus distinct details/reasons. |
| 4412593401 | Zero-budget comment stale | Corrected the comment: an absent pill budget defaults to one; explicit zero remains valid. No behavior change. |
| 4412593408 | Review scope undercounted | Optimizer Design names the initial 26 Cubic and two Revera findings and links subsequent rounds, instead of treating 26 as the complete scope. |
| 4412593418 | Contradictory ordering documentation | Aligned Optimizer Design and the skill with the implementation's single lexicographic order: premature-ending bound, goal lower bound, frontier progress, expected turns, resource reserve. Exact fully resolved probabilities are complementary; unresolved/hidden-probability policies retain conservative bounds. The comparator itself is unchanged. |
| 4412593430 | Inert diagnostics leak across partitions | Inert root diagnostics are recorded only when the skill belongs to rootSkillKeys (or no partition filter exists). Regression checks owning and non-owning partitions. |
| 4412704622 | Native harmony rule list has seven entries | Disagree. The freshly checked installed 0.7.18 bundle has a seven-entry Wmo rule whitelist even though gameplay has nine harmonies. rho compiles an absent index to expression 0, including for !=. Expanding to HARMONY_TYPES would predict consumption the game skips. Named/documented the native whitelist and added invalid-index and valid equality/inequality tests across all nine playable harmonies. Runtime Evidence §19 records the exact distinction. |
| 4412704642 | Truncated hidden-PRD branch can certify success | Fixed conservatively: any omitted hidden-probability outcome contributes zero to the goal lower bound and unit risk/unknown bounds. We do not multiply by nominal enumeration mass, because those weights are not calibrated probabilities when the prior PRD streak is hidden. A deterministic setup plus a 128-outcome failure subtree reproduces the false certificate; a larger enumeration exposes a missed failing outcome. The bounded planner now refuses certification and still blocks dispatch of the incomplete follow-up. |
| 4412704664 | Descendant hidden PRD displayed as exact percentage | Added policy-level probabilityUncertain metadata, OR-ed through every backup and preserved by JSON/worker merge. Success percentages require both complete coverage and no hidden probability anywhere in the selected continuation. Regression distinguishes a hidden-streak descendant from a known calibrated streak. |

### Second-round validation

Final results for the second round, 2026-10-29:

- **50 Jest suites / 1,098 tests passed** in one complete run after the fixes. The 10 new review cases cover omitted hidden-PRD outcomes, descendant uncertainty, exact known-streak probabilities, worker diagnostics and native harmony rule indices.
- Strict TypeScript and production build passed at **6.9.0**, with the three existing webpack size warnings. The compiled worker passed the guaranteed-vs-fatal smoke and both new probability-certificate checks: no false guarantee from omitted hidden-PRD outcomes and no exact percentage from a hidden-streak descendant.
- Seven fixed-budget production replay recommendations remained unchanged versus reviewed head `dbfb996`. The new hostile regressions specifically exercise the corrected probability paths absent from those replay samples.
- Fresh installed-runtime verification confirmed **0.7.18-97c093b** and the same Game.js hash recorded in Runtime Evidence §19. Native Wmo remains seven entries; the gameplay registry has nine. Valid equality/inequality cases and absent indices are covered separately.
- Documentation inventory, link, freshness and authority checks passed. Rust source and its corpus were unchanged in this round; the first-round Rust and historical benchmark results above remain separately scoped evidence.

The immediate-outcome execution gate was retained. No live gameplay/visual validation or installed-mod replacement was performed in this round.

## Third review round (reviewed head 82f64b1)

| Review comment | Finding | Disposition and evidence |
| --- | --- | --- |
| 4413441610 | Valid harmony indices 1–5 missing from the regression matrix | Expanded the native harmony-rule matrix from boundary indices 0/6 to every valid index 0–6, across all nine playable harmonies and both equality/inequality operators (126 combinations). Retained the separate invalid-index cases. This changes test coverage only; production behavior and version 6.9.0 are unchanged. |

Validation on 2026-10-29: `prReviewRound2.test.ts` passed all 10 tests, including the expanded 126-combination matrix and retained invalid-index cases. Documentation inventory, link, freshness and authority checks passed. Production files are unchanged from the second-round full-suite/build validation above.

## Independent artifact review: sublime recovery loop

The user supplied an independently executed artifact comparison and a machine-readable fixture for a remaining full-bar recovery loop. The archived **6.9.0 / 5158eec** package was rerun with the reviewer's inspected, unmodified extraction and fixture probe scripts. It reproduced **Restore ×5 → Gamble**, consuming 100 Qi without changing stability, progress, buffs or cooldowns. The original 6.8.0 also does so; this is a residual defect, not evidence of a new regression.

The supplied [fixture](../../src/__tests__/fixtures/full-stability-sublime.json) is preserved byte-for-byte (SHA-256 `ab830c5c23994dd0a477cc1b2ed67aafa7bb8750db763db9273583100eff3d36`). It uses 200 Qi, full 60 stability, 100/100 progress, 3,000/3,000 caps, 8/8 requested bands and depth 6. Only the restore and a terminal 50/50 gamble are available. The original probe scripts stay outside the production repository; [the regression suite](../../src/__tests__/sublimeRecovery.test.ts) loads the supplied fixture with matching skill defaults.

### Correction and boundaries

The no-benefit proof no longer rejects a state merely because the craft is sublime or has a known harmony type. It compares the complete harmony value and subsystem state on every evaluated outcome. The known pure harmony processors consume retained subsystem state and action context, not absolute turn/history. Cooling, charges, pattern progress, attunement and charge-release effects keep recovery available whenever they change that state. Unknown harmony types, unidentified harmony data, dynamic dependencies, active buffs, native item hooks and condition dependencies remain outside the proof. Cooldown progress and other modeled changes are still compared. The ranking and execution safety gates are unchanged.

This extends a sufficient no-benefit proof; it does not claim to eliminate every wasted recovery policy. The corrected fixture selects **Gamble immediately at 200 Qi**, explicitly marked risky with 0.5 goal probability. No guaranteed alternative exists in that fixture. Tests also preserve useful forge cooling, Returning Cycle release, evolving harmony states, cooldown/forecast waits, active buff ticks and turn-dependent effects.

### Independent-review follow-up validation

Validated on 2026-10-29:

- The reviewer's inspected, unmodified extractor and fixture runner reproduced five restores before the gamble on the archived 5158eec package. Against the rebuilt package, the same scripts select the gamble immediately. The original 6.8.0 control still performs the five restores.
- The actual worker strings extracted from both package main bundles independently reproduce the before/after sequence. The corrected worker starts the gamble with **200 Qi**, sets probabilistic-survival risk, and reports goal probability 0.5 / premature-ending probability 0.5. No gamble outcome was sampled to choose the result.
- **51 Jest suites / 1,118 tests passed** in one complete run. Twenty new cases cover depths 1/6/96, repeated replanning, the sublime flag control, worker partition merging, unchanged Forge/Formless/Decree states, evolving states across the other harmonies, useful cooling and Cycle release, cooldown/forecast waits, buffs, dynamic expressions and unknown harmony implementations.
- Strict TypeScript and the production build passed at **6.9.0**, with the three existing webpack size warnings. The packaged-worker guaranteed-finish and hidden-PRD uncertainty smoke tests also passed.
- Seven fixed-budget production replay recommendations and policy metadata stayed identical versus the preceding source. The supplied residual fixture specifically exercises the corrected path.
- Documentation inventory, link, freshness and authority checks passed. Transition arithmetic, Rust source and the differential corpus were unchanged; prior scoped Rust results above were not rerun or relabeled as a fresh run.

This is executable synthetic/source/artifact validation, not new live-game acceptance. The previously installed mod and preserved comparison archives were not modified.

## Fourth review follow-up (fixes shipped in 772c680)

Three valid findings were fixed, including a carried-over pre-auto-use gate finding. The proposed step-zero-reagent exception was rejected with a regression showing the actual availability change and why it cannot benefit an inert wait.

Those findings were raised against cf73ce2; the implementation and validation below belong to 772c680. The older revision is the comparison baseline.

| Review comment | Finding | Disposition and evidence |
| --- | --- | --- |
| 4413767132 | Preserve pre-auto-use technique availability | Fixed. Candidate admission now uses canApplySkill against the pre-hook state (the same predicate used by getAvailableSkills), before lazily projecting native items. A 5-Qi state cannot trigger a 10-Qi technique through an auto-use Qi-restoring pill. Enabled alternatives still receive the projected item effects; unavailable post-item branches remain unresolved. Runtime Evidence §19 records the enabled-control/callback order. |
| 4415878062 | Step-zero reagent expiry should disable inert-recovery pruning | Disagree with this example and remedy. A reagent in the planner's ordinary action roster is optional. Advancing the turn only removes that choice; skipping the inert restore keeps at least those options and more Qi. The regression confirms the reagent is available before the restore and unavailable afterward, while the no-benefit restore is correctly pruned. Adding a blanket exclusion would permit wasted restores again. Forced native item plans are already excluded from this proof, and cooldowns, forecast conditions and genuine turn-dependent expressions remain protected. |
| 4416024351 | Unknown effects can receive complete transition certificates | Fixed with conservative certificate preflight for known effect/mastery/trigger kinds, condition modes, scaling shapes and supported expression syntax, including nested and active/resolved buff definitions. Unsupported payloads return unresolved mass one plus a reason, and cannot pass root/dispatch certification. Unknown native item effects use the same boundary. Legacy EV estimates remain permissive. Nullable optional metadata from legacy replay transport remains supported. |
| 4416024360 | Selected goals overwrite tier requirements and binding bar | Fixed. Tier requiredBands and bindingBar now come from TIER_REQUIREMENTS/classifyOutcome. A separate requestedGoals projection and UI section retain selected flat/band targets, attainment, binding and live-resolution status. Perfect can be secured while an eight-band goal is still pending; met goals have no binding bar even while the craft remains active. |

### Fourth-follow-up validation

- Full Jest run: **52 suites / 1,143 tests passed**. The two affected presentation/certification suites were also rerun after the final compatibility/presentation adjustments (**46 tests passed**).
- Strict TypeScript, production build and UI harness build passed at **6.9.0**. The three existing webpack size warnings remain. The new harness scenes are `?state=outcome-goals` and `?state=outcome-goals-met`.
- Compiled-worker checks cover unsupported-effect refusal, pre-hook affordability, separate eight-band goal projection, preserved sublime inert-recovery behavior, guaranteed finish versus gamble, and hidden-PRD uncertainty handling.
- Seven fixed-budget production replay recommendations and planning fields remain unchanged versus cf73ce2. Initial probing exposed optional null metadata in two legacy skills; compatibility was corrected and regressed before the final results.
- Documentation inventory/link/freshness/authority checks passed. Existing Rust transition arithmetic and differential data were not modified.
- Visual inspection was attempted, but the app browser timed out reaching the localhost harness. No visual or live-game acceptance claim is made; the temporary server was stopped. The installed mod remains unchanged.

## Fifth review follow-up (findings on 772c680)

Four implementation findings and one documentation clarification were addressed. The terminal-label finding was rejected with a full planner-to-summary regression. Ranking, risk ordering, probability accounting and dispatch snapshot verification were preserved.

| Review comment | Finding | Disposition and evidence |
| --- | --- | --- |
| 4416939157 | Native availability payload | Fixed. This was a real worker gap: the inspected 0.7.18 dcu checks firstActionOnly, strict minStability and disableAtMaxStacks, and the game contains techniques using all three. Workers now enforce these gates plus exact native condition/resource/buff requirements without relying on the live callback. Raw native fields are schema-checked before certification; unknown fields and malformed gates remain unresolved. Directly copied payment fields must match the projected transition, and native payload changes invalidate recommendation context. Simulated cooldowns remain authoritative. The local gate matched the extracted native function across 486 cases. |
| 4416939168 | Terminal goals label | Disagree for the reviewed head. buildOutcomeSummary already chooses “Selected goals not reached” when goals are unmet and projection.willAutoFinish is true; the panel renders that status directly. Added an end-to-end source regression through findBestSkill with zero stability and unmet goals, verifying no recommendation and the stopped label. No production UI change was needed. |
| 4416939182 | Unsupported expression values | Fixed. Certification now parses a restricted numeric/boolean formula grammar before compilation. Object literals, bare function values, comma expressions, null, empty numeric calls, nonfinite literals and update operators are rejected. Supported arithmetic, comparisons, logical operators, parentheses and numeric calls remain accepted. The permissive EV evaluator is unchanged; rejected formulas become unresolved transitions instead of certificates based on its zero fallback. |
| 4416939188 | Unsupported unselected native items | Fixed. Native selection now precedes payload preflight. An unsupported item proven skipped by inventory, rule, pill budget, max count or toxicity no longer blocks an otherwise enabled technique. Unknown selection and unsupported selected items remain unresolved. Selector structural guards preserve conservative handling of malformed effect arrays. Regression cases cover all five skip reasons and the unresolved controls. |
| 4416939200 | Unresolved active buff definitions | Fixed. After roster-based buff resolution, any remaining active buff without a definition returns an explicit unresolved reason. A buff successfully resolved from the roster remains supported. This exposed one historical replay that saved only names/stacks for nine active buffs; its fixture is preserved, and the regression now requires a pause naming Spirit Cauldron Construct rather than an uncertifiable pick. Seven other fixed-budget replay recommendations and policy fields stayed unchanged. |
| 4416939210 | Validation revision label | Clarified. The fourth-follow-up heading now says “fixes shipped in 772c680”, and the text explicitly identifies cf73ce2 as the revision against which the findings were raised and the comparison baseline. The 52-suite validation is attributed to the implementation in 772c680. |

### Fifth-follow-up validation

Full Jest: **53 suites / 1,182 tests passed**. Strict TypeScript and production build passed at 6.9.0 (three existing webpack size warnings). Rust: **94 passed, 3 profiling tests ignored**; the regenerated 178-scenario / 1,555-transition corpus is unchanged. Compiled-worker checks cover the new native gates, missing buffs, unsupported expressions and unselected items, plus previous guaranteed-finish, hidden-PRD, eight-band and inert-recovery checks. The installed-runtime gate comparison passed **486 cases**. Seven fixed-budget replay recommendations and planning fields remained identical to 772c680; the separate incomplete historical replay now correctly pauses. Documentation checks passed. No new live-game or visual acceptance claim is made.

## Sixth review follow-up (findings on 7700a58)

All three findings were reproduced and fixed. Ranking and probability ordering remain unchanged; the fixes preserve branch identity and refuse certificates when required mechanics are missing.

| Review comment | Finding | Disposition and evidence |
| --- | --- | --- |
| 4422548176 | Malformed native createBuff payloads | Fixed. The selector structural guard now requires createBuff.buff to be an object with a nonempty string name before it evaluates stack checks or self-reference rules. The registry scan also checks the name type before normalization, including malformed unselected entries examined while matching another slot. Invalid selected payloads remain unresolved rather than throwing. Tests cover absent/null/empty buff payloads, numeric/empty names, and the registry-scan path. |
| 4422591221 | Nested fields lost from exact state identity | Fixed. The JSON replacer now strips history and _cacheKey only when their owner is the root CraftingState object. Nested fields with either name remain in the shared action/policy cache identity. The reported setup/conditional-counter/fusion reproduction failed before the fix by publishing goal probability 1; both history and _cacheKey variants now publish goal probability 0.5 and premature-ending probability 0.5. The same counterexamples pass through the compiled worker. |
| 4422591232 | Missing sublime harmony data certified as complete | Fixed conservatively. Certification now requires a recognized selected harmony and an established harmony envelope; after step zero it also requires the active stateful subsystem. There is no blanket Forge or Returning Cycle exemption: observed Forge fallbacks are already hydrated, while missing-source presentation defaults are withheld by the live adapter. The Resonance counterexample now pauses instead of certifying two actions; the observed fusion-resonance state correctly pays the extra 3 stability and ends early. Tests cover all nine types, initialized controls and an empty midcraft envelope. Unknown/unspecified harmonies also pause. Old synthetic tests now specify Formless explicitly; the supplied incomplete recovery fixture remains unchanged and gets its own refusal regression. |

### Sixth-follow-up validation

Full Jest: **54 suites / 1,201 tests passed**. Strict TypeScript and production build passed at 6.9.0 with the three existing webpack size warnings. Rust: **94 passed, 3 profiling tests ignored**; regeneration left the 178-scenario / 1,555-transition differential corpus unchanged. The compiled worker passes both nested-counter 50% risk cases, missing-harmony refusal and malformed-item refusal, alongside prior guaranteed-finish, hidden-PRD, native-gate and eight-band checks. Inert recovery remains pruned in an explicitly established Formless craft. Seven fixed-budget replay recommendations and planning fields remain identical to 7700a58. Documentation checks passed. This is source/artifact validation, not live-game acceptance; the installed 7700a58 package was not changed in this follow-up.

---
title: Optimizer Design
status: active
authoritative: true
owner: craftbuddy-maintainers
game_version: 0.7.17-d8ae6ce
last_verified: 2026-10-29
source_of_truth: src/optimizer/outcome.ts, src/optimizer/search.ts, src/optimizer/skills.ts, src/optimizer/stochastic.ts, src/optimizer/state.ts, src/optimizer/index.ts
review_cycle_days: 30
related_files:
  - AGENTS.md
  - docs/project/MECHANICS_PARITY.md
  - docs/project/OPTIMIZER_ENGINE_FINDINGS.md
  - docs/project/TESTING.md
  - scripts/optimizer/benchmark-engines.ts
---

# Optimizer Design

The October 2026 audit found that the 6.8.0 expected-value beam search could exhaust stability below the requested quality, restore an already full bar, and change its objective when evaluating a deeper terminal action. The revised production planner treats requested completion and perfection as joint goals, with explicit stochastic action outcomes and bounded planning.

The installed game inspected during that audit was **0.7.18-97c093b**. Historical runtime parity evidence targets **0.7.17-d8ae6ce**; those test results do not establish exhaustive parity with every 0.7.18 mechanic. Report current validation separately from the 6.8.0 release results.

## Module boundary

`src/optimizer/index.ts` is the public boundary for integration and UI code. The optimizer is pure: no DOM, Redux or live game reads occur inside it.

| Module | Owns |
| --- | --- |
| `outcome.ts` | Band thresholds, actual item tiers, actual auto-finish rule, `resolvePlanningGoals` |
| `constrainedPlanner.ts` | Production `constrainedSearch`, bounded stochastic planning and policy metadata |
| `skills.ts` | Action legality and transition phases, discrete action outcomes and survival checks |
| `stochastic.ts` | Bounded decision enumeration with unresolved probability mass retained explicitly |
| `state.ts` | Resources, cooldowns, buffs/internal state, harmony, inventory and step |
| `gameTypes.ts` | Scaling, effect definitions, condition data and band-count formulas |
| `harmony.ts`, `harmonyRegistry.ts` | Harmony subsystem transitions and definitions |
| `search.ts` | Public `findBestSkill` route; retained legacy greedy/lookahead and scoring for reference tests |
| `searchBackend.ts` | Worker serialization and combination of public recommendations |

## The conjunctive outcome model

The game's item tier and the player's requested goal are distinct:

```text
basic   = 1 completion band
perfect = 1 completion band AND 1 perfection band
sublime = 2 completion bands AND 2 perfection bands, if a sublime item exists
```

Band widths grow by 1.3 with flooring at each step. `bandThreshold(100, n)` produces 100, 230, 399, 618 and 902 for the first five bands. `classifyOutcome` reports the actual guaranteed tier and the possible craft-end bonus roll. Requesting eight bands does not redefine perfect or sublime.

## Requested goals

`resolvePlanningGoals(config, targetCompletion, targetPerfection, settings)` is the shared authority for the two requested flat targets. Its result also carries ordinary tier baselines and unchanged `OutcomeBands`.

| Setting | Meaning |
| --- | --- |
| Explicit completion or perfection value 1-8 | Request that many bands on that bar, clipped to its reported actual cap |
| Auto (0) with Push Extra Bands enabled | Request the actual caps on both bars |
| Auto (0) with Push Extra Bands disabled | Request ordinary tier requirements |
| Missing or non-finite cap | Fall back to the ordinary tier requirement; do not invent a larger reachable cap |
| Absent recipe bar or actual zero cap | No work is required on that bar |

The persisted key `completionBandCeiling` remains compatible with saved settings, but its UI label is **Completion Band Goal** and an explicit value is now a requested goal. Values may be below a sublime requirement; the resulting item tier is still classified honestly. Requests exceeding the cap are clipped, not treated as proof that the higher request is achievable.

Goals feed progress, remaining work, termination assessment and every terminal scoring path. Banking the baseline tier does not satisfy a higher request. Retained legacy scorers also use selected goals for remaining work, overshoot, progress margins and terminal shortfall; no scoring constant was tuned.

## Terminal states: there is no manual finish

`willAutoFinish` is the game's terminal predicate. Stability zero resolves the craft; it does not necessarily destroy the item, but prevents further work. A terminal state below the selected goals is a premature ending even if the game awards a basic, perfect or sublime item.

The installed 0.7.18 game also auto-finishes when both actual cap flats are reached. Its predicate has no five-completion-band shortcut; the older shortcut was removed after inspection of `Eho` (`RUNTIME_EVIDENCE.md` section 18).

Meeting selected goals while the game remains live is not yet a completed item. Planning continues with real legal actions toward a resolution that preserves both requested bars; no imaginary Finish action is introduced.

There is no actionable Finish Craft button. The legacy internal finish marker represents resolution, never an automation command. Wait is a real technique with a stability cost. See `RUNTIME_EVIDENCE.md` for extracted rules.

## State and action transitions

State includes resources/caps, step, cooldowns, inventory, buffs with stacks and internal state, condition forecast and harmony. State identity must include every field affecting legality, transitions or future value.

The 0.7.17 phases remain: toxicity/droplets/buff payment; capture success chance; effect masteries; recompute/pay Qi and stability; success-only effects; pre-action-name buff ticks; harmony; decay/cap cleanup. Failed actions still pay and retain mastery effects. Cost-reduction and penalty channels remain independent. Returning Cycle drains reported payment before stabilization releases charges. Planning and survival checks must share these rules.

Native auto-use is a pre-technique transition, not permission to double-consume an item. Unavailable or unmodelled information must remain explicit rather than silently certifying safety.

## Production search

`findBestSkill` routes to `constrainedSearch`. It builds a sparse, bounded AND/OR graph: player choices are decision nodes; each action's possible outcomes are chance branches. Bellman backups evaluate contingent continuations rather than scoring one averaged state as if it occurred.

For two fully resolved policies, decision priorities are lexicographic:

1. Lower bound on the probability of achieving **both** selected goals.
2. Avoid premature terminal outcomes while goals remain unmet.
3. Advance normalized progress toward selected goals.
4. Prefer useful resources and fewer turns among otherwise equivalent plans.

If either policy has an unresolved frontier, the ordering is conservative:
avoid known premature-ending risk first, then compare certified goal probability
and progress. An unresolved continuation with no known ending risk can therefore
outrank a partly successful gamble. This is a cautious budget-limited choice,
not proof that the unresolved continuation is feasible or globally optimal.
Exact self-loops and dominated inert restorations must not exploit that preference.

This is not an unbounded global optimality claim. Time, node and horizon budgets limit planning. An unexpanded future or truncated action distribution contributes unresolved probability, not free success. Exact per-call state caching does not reuse stale scored entries across changed goals or runtime context.

### Probability handling

Technique success, critical rolls and supported chance-conditioned effects are action branches. They are not converted into fractional progress, restoration or persistent buff state before terminal rules are applied. Bounded enumeration retains unresolved mass explicitly, without renormalizing the explored subset into certainty.

The visible three-condition forecast is used where known. Future queue entries retain their generation-time harmony and dependencies, but branch only when consumed; observed entries are substituted into dependent rolls. This avoids expanding invisible condition combinations prematurely without changing their probabilities. All resulting condition probabilities are retained.

The installed 0.7.18 success model uses a persistent failure streak. When a recorded success establishes the current streak, the planner uses the actual calibrated PRD coefficient. Unknown carry-over streaks use robust outcome bounds, not guessed probabilities. Critical chains use the live overcrit stat. The native RNG helper is never invoked to estimate an average.

### Stability and resource budgeting

A plan pays simulated action costs, including state-dependent modifiers and restoration effects, along each branch. A restore is useful when it enables a preferable continuation or has another real modeled effect; adding stability to an already full bar provides no recovery value.

Resource estimates can order unfinished work, but averages do not certify that a complete rotation fits. Reaching a search horizon does not establish feasibility of the remaining quality. Uncertainty must remain visible in the result and execution boundary.

### Result contract

Actual item tier, selected-goal achievement and planning uncertainty are separate. `recommendation.planning` carries `goalProbabilityLowerBound`, `prematureEndProbability`, `frontierProgress`, `resourceReserve` and `expectedSteps`. Worker merging uses those same objective fields rather than reordering safety decisions by a legacy raw score.

A high heuristic score or baseline tier is not a verified full-goal plan. A displayed rotation is one conditional projection, not a promise that all random outcomes follow it. Integration revalidates state and action safety before dispatch.

## Retained legacy search and Rust engine

`greedySearch` and `lookaheadSearch` remain exported for reference and regression tests. They use expected-value transitions, beam search, iterative deepening and heuristic scoring. Their survival floors and penalties do not provide a general safety proof. The old cross-step cache, probability pruning and MCTS near-tie prior belong to this legacy path, not production planning.

The Rust/WASM engine and historical differential corpus remain evidence for the previously modeled transition surface. They do not establish parity for the new discrete stochastic planner. The legacy Experimental setting does not make Rust the production planning authority. Do not claim new parity without appropriate checks. Historical measurements remain in `OPTIMIZER_ENGINE_FINDINGS.md` and `ENGINE_PERFORMANCE.md`.

## Determinism and validation

Use fixed node/horizon budgets and deterministic fixtures to test decisions. Wall-clock truncation is machine-dependent; larger search settings cannot repair incorrect transitions or objectives. Report resolved and unresolved coverage separately. Not every requested goal is achievable.

Focused coverage includes `planningGoals.test.ts`, `outcome.test.ts`, `auditSearch.test.ts`, stochastic transition tests and execution tests. Run the full TypeScript suite and production build before shipping. Label Rust/replay benchmarks historical or reference until validated under the new objective. Never change a constant merely to reproduce an old pick.

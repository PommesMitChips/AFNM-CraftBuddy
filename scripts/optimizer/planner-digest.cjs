// Adapted from upstream #5/#16's fixed-work digest and ceiling gate.
// Uses the fork's production entrypoint and safety metadata, never legacy EV
// scores as a substitute. Node runner keeps this usable without Bun on Windows.
const fs = require('fs');
const path = require('path');
const cp = require('child_process');
const assert = require('assert/strict');
const ts = require('typescript');
const root = path.resolve(__dirname, '../..');
const args = process.argv.slice(2);
const option = (flag, fallback) => {
  const index = args.indexOf(flag);
  if (index < 0) return fallback;
  assert.ok(
    args[index + 1] && !args[index + 1].startsWith('--'),
    `${flag} needs a value`,
  );
  return args[index + 1];
};
const nodes = Number(option('--nodes', '250'));
const ceiling = Number(option('--ceiling-ms', '120000'));
assert.ok(Number.isInteger(nodes) && nodes > 0 && ceiling > 0);
const revision = option('--revision');
const commit = cp
  .execFileSync(
    'git',
    ['rev-parse', '--verify', `${revision ?? 'HEAD'}^{commit}`],
    { cwd: root, encoding: 'utf8' },
  )
  .trim();
const comparePath = option('--compare');
const output = path.resolve(root, option('--out', 'tmp/planner-digest.json'));
if (comparePath) assert.notEqual(path.resolve(comparePath), output);
require.extensions['.ts'] = (module, filename) => {
  const relative = path.relative(root, filename).replaceAll('\\', '/');
  const source =
    revision && relative.startsWith('src/')
      ? cp.execFileSync('git', ['show', `${commit}:${relative}`], {
          cwd: root,
          encoding: 'utf8',
          maxBuffer: 16e6,
        })
      : fs.readFileSync(filename, 'utf8');
  module._compile(
    ts.transpileModule(source, {
      compilerOptions: {
        target: ts.ScriptTarget.ES2020,
        module: ts.ModuleKind.CommonJS,
        esModuleInterop: true,
      },
    }).outputText,
    filename,
  );
};
const { findBestSkill } = require('../../src/optimizer/search.ts');
const {
  getReplaySearchInput,
} = require('../../src/__tests__/__fixtures__/replaySnapshots.ts');
const directory = path.join(
  root,
  'src/__tests__/__fixtures__/replay-snapshots',
);
const selected = option('--fixture', '');
const files = fs
  .readdirSync(directory)
  .filter((name) => name.endsWith('.snapshot.json') && name.includes(selected))
  .sort();
assert.ok(files.length, 'No replay fixtures selected');
const results = files.map((file) => {
  const input = getReplaySearchInput(
    JSON.parse(fs.readFileSync(path.join(directory, file), 'utf8')),
  );
  const started = performance.now();
  const result = findBestSkill(
    input.state,
    input.config,
    input.targetCompletion,
    input.targetPerfection,
    false,
    8,
    input.currentCondition,
    input.forecastConditions,
    {
      ...input.searchConfig,
      maxNodes: nodes,
      timeBudgetMs: ceiling,
      beamWidth: 5,
    },
  );
  const elapsedMs = performance.now() - started;
  const ranked = [result.recommendation, ...result.alternativeSkills].filter(
    Boolean,
  );
  const failures = [];
  if (result.searchMetrics.nodesExplored > nodes)
    failures.push('node budget exceeded');
  if (elapsedMs >= ceiling)
    failures.push(
      'wall ceiling reached: not a completed fixed-work comparison',
    );
  if (!result.rootEvaluation?.complete && ranked.length)
    failures.push('partial root was executable');
  for (const rec of ranked) {
    const p = rec.planning;
    if (
      !p ||
      !Number.isFinite(p.goalProbabilityLowerBound) ||
      p.goalProbabilityLowerBound < 0 ||
      p.goalProbabilityLowerBound > 1 + 1e-9
    )
      failures.push('invalid planning bound');
    if (!input.config.skills.some((s) => s.key === rec.skill.key))
      failures.push('non-roster action');
  }
  const entry = {
    fixture: file,
    recommendation: result.recommendation?.skill.key ?? null,
    planning: result.recommendation?.planning ?? null,
    rootEvaluation: result.rootEvaluation,
    blockedReasons: result.blockedReasons,
    rotation: result.optimalRotation,
    nodes: result.searchMetrics.nodesExplored,
    depth: result.searchMetrics.depthReached,
    elapsedMs: Math.round(elapsedMs),
    failures,
  };
  console.log(
    `${file}: ${entry.recommendation ?? 'PAUSED'} / ${entry.nodes} nodes / ${entry.elapsedMs} ms`,
  );
  return entry;
});
const functional = ({ elapsedMs, ...entry }) => entry;
const contracts = require('./planner-replay-contracts.json');
if (!revision && nodes === contracts.nodeBudget) {
  for (const entry of results) {
    const expected = contracts.cases.find((c) => c.fixture === entry.fixture);
    const actual = {
      fixture: entry.fixture,
      recommendation: entry.recommendation,
      planning: entry.planning,
      rootComplete: entry.rootEvaluation?.complete,
      blockedReasons: entry.blockedReasons ?? null,
    };
    if (!expected || JSON.stringify(expected) !== JSON.stringify(actual))
      entry.failures.push(
        'reviewed production recommendation/safety contract changed',
      );
  }
}
const differences = [];
if (comparePath) {
  const baseline = JSON.parse(fs.readFileSync(comparePath, 'utf8'));
  assert.equal(
    baseline.nodeBudget,
    nodes,
    'Comparisons require equal node budgets',
  );
  for (const entry of results) {
    const before = baseline.results.find((b) => b.fixture === entry.fixture);
    if (
      !before ||
      JSON.stringify(functional(before)) !== JSON.stringify(functional(entry))
    )
      differences.push(entry.fixture);
  }
}
const report = {
  revision: revision ? commit : `working tree based on ${commit}`,
  nodeBudget: nodes,
  ceilingMs: ceiling,
  actionable: results.filter((r) => r.recommendation).length,
  paused: results.filter((r) => !r.recommendation).length,
  differences,
  results,
};
fs.mkdirSync(path.dirname(output), { recursive: true });
fs.writeFileSync(output, JSON.stringify(report, null, 2) + '\n');
console.log(
  JSON.stringify({
    actionable: report.actionable,
    paused: report.paused,
    differences,
    output,
  }),
);
if (
  results.some((r) => r.failures.length) ||
  (args.includes('--require-equal') && differences.length)
)
  process.exitCode = 1;

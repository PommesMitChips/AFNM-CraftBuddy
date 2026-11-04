// Small development runner for environments with Node but no Bun.
const fs = require('fs');
const path = require('path');
const ts = require('typescript');
require.extensions['.ts'] = (module, filename) =>
  module._compile(
    ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
      compilerOptions: {
        target: ts.ScriptTarget.ES2020,
        module: ts.ModuleKind.CommonJS,
        esModuleInterop: true,
      },
    }).outputText,
    filename,
  );
const script = process.argv[2];
if (!script)
  throw new Error(
    'Usage: node scripts/run-typescript.cjs <script.ts> [arguments]',
  );
process.argv.splice(1, 1);
require(path.resolve(script));

import { mkdtempSync, readdirSync, readFileSync, rmSync } from 'node:fs';
import { createRequire } from 'node:module';
import { tmpdir } from 'node:os';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const packageDirectory = fileURLToPath(new URL('../', import.meta.url));
// Match the installed CLI's CommonJS loader: its ESM loader resolves presets from the CLI's own dependencies.
const { generate, loadCodegenConfig } = createRequire(import.meta.url)('@graphql-codegen/cli');
const temporaryDirectory = mkdtempSync(join(tmpdir(), 'darun-codegen-check-'));

function readFiles(directory, prefix = '') {
  try {
    return readdirSync(directory, { withFileTypes: true }).flatMap(entry => {
      const file = join(prefix, entry.name);
      return entry.isDirectory()
        ? readFiles(join(directory, entry.name), file)
        : [[file, readFileSync(join(directory, entry.name))]];
    });
  } catch (error) {
    if (error.code === 'ENOENT') return [];
    throw error;
  }
}

try {
  const { config } = await loadCodegenConfig({ configFilePath: join(packageDirectory, 'codegen.ts') });
  const outputs = Object.entries(config.generates);
  const redirectedOutputs = outputs.map(([, options], index) => [
    join(temporaryDirectory, String(index), '/'),
    options,
  ]);
  await generate({ ...config, cwd: packageDirectory, generates: Object.fromEntries(redirectedOutputs) });

  const changedFiles = outputs.flatMap(([destination], index) => {
    const original = new Map(readFiles(join(packageDirectory, destination)));
    const generated = new Map(readFiles(redirectedOutputs[index][0]));
    return [...new Set([...original.keys(), ...generated.keys()])]
      .filter(file => !original.has(file) || !generated.has(file) || !original.get(file).equals(generated.get(file)))
      .map(file => relative(join(packageDirectory, '../../..'), join(packageDirectory, destination, file)));
  });
  if (changedFiles.length > 0) {
    throw new Error(
      `Missing or outdated GraphQL generated files:\n${changedFiles.sort().join('\n')}\nRun pnpm --filter @darun/provider-graphql codegen and commit the generated files (remove obsolete files).`
    );
  }
  console.log('GraphQL generated files match the schema and source documents.');
} finally {
  rmSync(temporaryDirectory, { recursive: true, force: true });
}

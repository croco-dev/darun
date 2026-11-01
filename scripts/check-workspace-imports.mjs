import ts from 'typescript';
import { spawnSync } from 'node:child_process';
import { readFileSync, realpathSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const applications = ['graphql-api', 'service-web'];

export function checkWorkspaceImports(directory = root) {
  directory = realpathSync(directory);
  const inventory = spawnSync('pnpm', ['list', '--recursive', '--depth=-1', '--json'], {
    cwd: directory,
    encoding: 'utf8',
    timeout: 30_000,
  });
  if (inventory.error) throw inventory.error;
  if (inventory.status !== 0) throw new Error(inventory.stderr || inventory.stdout);
  const packages = JSON.parse(inventory.stdout)
    .map(workspace => ({
      directory: workspace.path,
      manifest: JSON.parse(readFileSync(path.join(workspace.path, 'package.json'), 'utf8')),
    }))
    .sort((a, b) => b.manifest.name.length - a.manifest.name.length);
  const errors = [];
  for (const application of applications) {
    const app = packages.find(workspace => workspace.manifest.name === application);
    if (!app) throw new Error(`Missing workspace application: ${application}`);
    const files = ts.sys.readDirectory(
      app.directory,
      ['.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs'],
      ['**/node_modules/**', '**/.next/**', '**/coverage/**', '**/__tests__/**', '**/e2e/**', '**/scripts/**'],
      application === 'graphql-api' ? ['src/**/*'] : ['**/*']
    );
    for (const file of files) {
      // Declarations and test tooling are not application execution sources.
      if (/\.d\.ts$|\.(test|spec)\.[cm]?[jt]sx?$|\/(vitest|playwright)\.config\./.test(file)) continue;
      const source = readFileSync(file, 'utf8');
      for (const imported of ts.preProcessFile(source, true, true).importedFiles) {
        const specifier = imported.fileName;
        if (!specifier.startsWith('@darun/')) continue;
        // Some workspace names themselves contain a subpath, such as provider-auth/client.
        const owner = packages.find(
          workspace => specifier === workspace.manifest.name || specifier.startsWith(`${workspace.manifest.name}/`)
        );
        const location = `${path.relative(directory, file)}: ${specifier}`;
        if (!owner) {
          errors.push(`${location}: no workspace package owns this import`);
          continue;
        }
        if (!app.manifest.dependencies?.[owner.manifest.name]?.startsWith('workspace:')) {
          errors.push(`${location}: declare ${owner.manifest.name} in ${application} dependencies with workspace:`);
        }
        // Do not use tsconfig aliases: they can bypass a package's public exports.
        const subpath = specifier === owner.manifest.name ? '.' : `.${specifier.slice(owner.manifest.name.length)}`;
        const exports = owner.manifest.exports;
        const isPublic =
          !exports ||
          (typeof exports === 'object' && Object.hasOwn(exports, subpath)
            ? exports[subpath] !== null
            : subpath === '.' && !Object.keys(exports).some(key => key.startsWith('.')));
        const resolved = ts.resolveModuleName(
          specifier,
          file,
          { module: ts.ModuleKind.ESNext, moduleResolution: ts.ModuleResolutionKind.Bundler },
          ts.sys
        ).resolvedModule;
        const relative =
          resolved && path.relative(realpathSync(owner.directory), realpathSync(resolved.resolvedFileName));
        if (
          !isPublic ||
          !resolved ||
          relative === '..' ||
          relative.startsWith(`..${path.sep}`) ||
          path.isAbsolute(relative)
        ) {
          errors.push(`${location}: cannot resolve a public entry in ${owner.manifest.name}`);
        }
      }
    }
  }
  return errors;
}

if (process.argv[1] && pathToFileURL(path.resolve(process.argv[1])).href === import.meta.url) {
  const errors = checkWorkspaceImports();
  if (errors.length) {
    console.error(errors.join('\n'));
    process.exitCode = 1;
  } else {
    console.log('graphql-api and service-web workspace imports have declared, public owners.');
  }
}

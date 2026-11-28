import { execFileSync, spawnSync } from 'node:child_process';
import { existsSync, lstatSync, mkdirSync, mkdtempSync, readdirSync, readlinkSync, rmSync, symlinkSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

const sourcePattern = /\.(?:[cm]?[jt]s|[jt]sx)$/;
const git = args => execFileSync('git', args, { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });

const stagedSources = () =>
  git(['diff', '--cached', '--name-only', '--diff-filter=ACMR', '-z'])
    .split('\0')
    .filter(file => sourcePattern.test(file));

// Relative links keep their meaning inside the snapshot, so workspace packages resolve to staged sources.
const linkEntries = (source, target) => {
  mkdirSync(target, { recursive: true });
  for (const entry of readdirSync(source, { withFileTypes: true })) {
    const from = path.join(source, entry.name);
    const to = path.join(target, entry.name);
    if (entry.name.startsWith('@') && entry.isDirectory()) {
      linkEntries(from, to);
    } else if (lstatSync(from).isSymbolicLink() && !path.isAbsolute(readlinkSync(from))) {
      symlinkSync(readlinkSync(from), to);
    } else {
      symlinkSync(from, to);
    }
  }
};

const createIndexSnapshot = cwd => {
  const snapshot = mkdtempSync(path.join(tmpdir(), 'darun-staged-'));
  // checkout-index honors GIT_INDEX_FILE, so partial and path-limited commits lint their exact input.
  git(['checkout-index', '--all', `--prefix=${snapshot}${path.sep}`]);
  const packageDirectories = git(['ls-files', '-z', '--', 'package.json', '*/package.json'])
    .split('\0')
    .filter(Boolean)
    .map(manifest => path.dirname(manifest));
  for (const directory of packageDirectories) {
    const modules = path.join(cwd, directory, 'node_modules');
    if (existsSync(modules)) linkEntries(modules, path.join(snapshot, directory, 'node_modules'));
  }
  return snapshot;
};

const run = (command, args, options) => {
  const result = spawnSync(command, args, { encoding: 'utf8', ...options });
  if (result.error) throw result.error;
  process.stdout.write(result.stdout);
  process.stderr.write(result.stderr);
  return result.status === 0;
};

const checkSnapshot = (cwd, snapshot, files) => {
  const bin = name => path.join(cwd, 'node_modules/.bin', name);
  const env = { ...process.env, OXLINT_TSGOLINT_PATH: bin('tsrs-lint') };
  const linted = run(bin('oxlint'), ['--no-error-on-unmatched-pattern', ...files], { cwd: snapshot, env });
  const formatted = run(bin('oxfmt'), ['--check', '--no-error-on-unmatched-pattern', ...files], { cwd: snapshot, env });
  return linted && formatted;
};

let snapshot;
try {
  const cwd = git(['rev-parse', '--show-toplevel']).trimEnd();
  process.chdir(cwd);
  const files = stagedSources();
  if (files.length > 0) {
    snapshot = createIndexSnapshot(cwd);
    if (!checkSnapshot(cwd, snapshot, files)) {
      console.error(
        'Staged content failed oxlint or oxfmt. Run `pnpm format`, review the changes, and stage only the intended hunks before committing again.'
      );
      process.exitCode = 1;
    }
  }
} catch (error) {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
} finally {
  if (snapshot) rmSync(snapshot, { recursive: true, force: true });
}

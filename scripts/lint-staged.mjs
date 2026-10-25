import { ESLint } from 'eslint';
import { execFileSync } from 'node:child_process';
import path from 'node:path';

const git = args => execFileSync('git', args, { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });

try {
  const cwd = git(['rev-parse', '--show-toplevel']).trimEnd();
  process.chdir(cwd);
  const files = git(['diff', '--cached', '--name-only', '--diff-filter=ACMR', '-z'])
    .split('\0')
    .filter(file => /\.(?:[cm]?js|jsx|ts|tsx|mdx|json)$/.test(file));
  const eslint = new ESLint({ cwd, fix: false });
  const results = [];

  for (const file of files) {
    // Read the exact commit input; lintFiles would read unstaged working edits.
    const source = git(['show', `:0:${file}`]);
    results.push(
      ...(await eslint.lintText(source, {
        filePath: path.resolve(cwd, file),
        warnIgnored: false,
      }))
    );
  }

  const errors = ESLint.getErrorResults(results);
  if (errors.length > 0) {
    const formatter = await eslint.loadFormatter('stylish');
    console.error(formatter.format(errors));
    console.error(
      'Staged content failed ESLint. Fix the reported files, review the changes, and stage only the intended hunks before committing again.'
    );
    process.exitCode = 1;
  }
} catch (error) {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
}

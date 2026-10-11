const { spawnSync } = require('node:child_process');
const { cpSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } = require('node:fs');
const { tmpdir } = require('node:os');
const { dirname, join, relative, resolve } = require('node:path');

const appDirectory = resolve(__dirname, '..');
const migrationDirectory = join(__dirname, 'migrations');

const { entries } = JSON.parse(readFileSync(join(migrationDirectory, 'meta', '_journal.json'), 'utf8'));
if (!Array.isArray(entries) || entries.length === 0) throw new Error('Migration journal has no entries.');
for (const [index, entry] of entries.entries()) {
  if (!Number.isFinite(entry.when) || (index > 0 && entry.when <= entries[index - 1].when)) {
    throw new Error(`Migration timestamps must be strictly increasing: ${entry.tag}.`);
  }
  const sql = readFileSync(join(migrationDirectory, `${entry.tag}.sql`), 'utf8');
  if (!sql.trim()) throw new Error(`Migration SQL is empty: ${entry.tag}.sql.`);
}

function readFiles(directory, prefix = '') {
  return readdirSync(directory, { withFileTypes: true }).flatMap(entry => {
    const relativePath = join(prefix, entry.name);
    const absolutePath = join(directory, entry.name);
    return entry.isDirectory() ? readFiles(absolutePath, relativePath) : [[relativePath, readFileSync(absolutePath)]];
  });
}

const temporaryDirectory = mkdtempSync(join(tmpdir(), 'darun-migration-check-'));

try {
  const temporaryMigrations = join(temporaryDirectory, 'migrations');
  const temporaryConfig = join(temporaryDirectory, 'drizzle.config.cjs');
  cpSync(migrationDirectory, temporaryMigrations, { recursive: true });
  writeFileSync(
    temporaryConfig,
    `module.exports = { ...require(${JSON.stringify(join(appDirectory, 'drizzle.config.cjs'))}), out: ${JSON.stringify(relative(appDirectory, temporaryMigrations))} };\n`
  );

  const drizzleCli = join(dirname(require.resolve('drizzle-kit')), 'bin.cjs');
  const result = spawnSync(process.execPath, [drizzleCli, 'generate', '--config', temporaryConfig], {
    cwd: appDirectory,
    encoding: 'utf8',
    input: '',
    timeout: 60_000,
  });
  process.stdout.write(result.stdout || '');
  process.stderr.write(result.stderr || '');
  if (result.error) throw result.error;
  if (result.status !== 0) throw new Error('Drizzle migration generation failed.');

  const originalFiles = new Map(readFiles(migrationDirectory));
  const generatedFiles = new Map(readFiles(temporaryMigrations));
  const changedFiles = [...new Set([...originalFiles.keys(), ...generatedFiles.keys()])].filter(
    file =>
      !originalFiles.has(file) || !generatedFiles.has(file) || !originalFiles.get(file).equals(generatedFiles.get(file))
  );
  if (changedFiles.length > 0) {
    throw new Error(
      `Missing or outdated migrations: ${changedFiles.join(', ')}. Run pnpm --filter graphql-api exec drizzle-kit generate --config drizzle.config.cjs and commit the generated SQL and metadata.`
    );
  }
  if (!result.stdout.includes('No schema changes, nothing to migrate')) {
    throw new Error('Drizzle did not confirm schema consistency. Resolve generation errors or rename prompts locally.');
  }
  console.log('Migration snapshots match the current schema.');
} finally {
  rmSync(temporaryDirectory, { recursive: true, force: true });
}

const { context } = require('esbuild');
const { existsSync, readFileSync } = require('fs');
const { spawn } = require('child_process');

for (const f of ['.env', '.env.local']) {
  if (existsSync(f)) {
    for (const line of readFileSync(f, 'utf8').split('\n')) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const eq = trimmed.indexOf('=');
      if (eq < 0) continue;
      const key = trimmed.slice(0, eq).trim();
      const val = trimmed.slice(eq + 1).trim().replace(/^["']|["']$/g, '');
      if (!(key in process.env)) process.env[key] = val;
    }
  }
}

process.env.INFRA_ENV ??= 'local';

const plugins = require('../esbuild.plugins.js');
let child;
let respawning = false;

async function main() {
  const ctx = await context({
    entryPoints: ['src/local-server.ts'],
    bundle: true,
    platform: 'node',
    target: 'node22',
    format: 'cjs',
    outfile: '.build/local.cjs',
    sourcemap: true,
    minify: false,
    keepNames: true,
    external: ['class-validator'],
    plugins: [
      ...plugins,
      {
        name: 'dev-restart',
        setup(build) {
          build.onEnd(result => {
            if (result.errors.length > 0) return;
            if (respawning) return;
            respawning = true;
            const spawnNew = () => {
              child = spawn('node', ['--enable-source-maps', '.build/local.cjs'], {
                stdio: 'inherit',
                env: process.env,
              });
              child.on('exit', () => {
                child = null;
              });
              respawning = false;
            };
            if (child) {
              child.once('exit', spawnNew);
              child.kill();
            } else {
              spawnNew();
            }
          });
        },
      },
    ],
  });
  await ctx.watch();

  const shutdown = async () => {
    if (child) child.kill();
    await ctx.dispose();
    process.exit(0);
  };
  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});

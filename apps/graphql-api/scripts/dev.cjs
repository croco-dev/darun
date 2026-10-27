/* eslint-disable @typescript-eslint/no-require-imports -- CommonJS entry point, like esbuild.plugins.js. */
const { context } = require('esbuild');
const { spawn } = require('child_process');
const { existsSync } = require('node:fs');
const { loadEnvFile } = require('node:process');

// loadEnvFile preserves existing values, including empty strings.
// Load local overrides first so shell > .env.local > .env.
for (const file of ['.env.local', '.env']) {
  if (existsSync(file)) loadEnvFile(file);
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

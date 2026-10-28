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
const CHILD_GRACE_MS = 3_000;
const CHILD_KILL_MS = 1_000;
const SHUTDOWN_MS = 5_000;

async function main() {
  let state = 'running';
  let child;
  let respawning = false;
  let shutdownTask;

  function stopChild() {
    if (!child) return Promise.resolve();
    const current = child;
    if (current.stopping) return current.stopping;
    current.stopping = new Promise((resolve, reject) => {
      const force = setTimeout(() => {
        try {
          current.process.kill('SIGKILL');
        } catch (err) {
          reject(err);
        }
      }, CHILD_GRACE_MS);
      const deadline = setTimeout(
        () => reject(new Error('Development server did not exit')),
        CHILD_GRACE_MS + CHILD_KILL_MS
      );
      current.exited.then(() => {
        clearTimeout(force);
        clearTimeout(deadline);
        resolve();
      });
      current.process.kill('SIGTERM');
    });
    return current.stopping;
  }

  function spawnNew() {
    if (state !== 'running') return;
    const server = spawn('node', ['--enable-source-maps', '.build/local.cjs'], {
      stdio: 'inherit',
      env: process.env,
    });
    const current = { process: server };
    child = current;
    current.exited = new Promise(resolve => {
      const onExit = () => {
        if (child === current) child = null;
        resolve();
      };
      server.once('exit', onExit);
      server.once('error', err => {
        // A spawn failure has no PID; other errors do not prove the child exited.
        if (server.pid === undefined) onExit();
        console.error(err);
        void shutdown(1);
      });
    });
  }

  function shutdown(code = 0) {
    if (shutdownTask) return shutdownTask;
    state = 'stopping';
    const finish = exitCode => {
      if (state === 'stopped') return;
      state = 'stopped';
      process.removeListener('SIGINT', onSignal);
      process.removeListener('SIGTERM', onSignal);
      process.exit(exitCode);
    };
    shutdownTask = (async () => {
      const deadline = setTimeout(() => {
        console.error('Development watcher shutdown timed out');
        finish(1);
      }, SHUTDOWN_MS);
      const results = await Promise.allSettled([stopChild(), ctx.dispose()]);
      clearTimeout(deadline);
      for (const result of results) {
        if (result.status === 'rejected') {
          console.error(result.reason);
          code = 1;
        }
      }
      finish(code);
    })();
    return shutdownTask;
  }

  function onSignal() {
    void shutdown();
  }
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
          build.onEnd(async result => {
            if (state !== 'running' || result.errors.length > 0 || respawning) return;
            respawning = true;
            try {
              await stopChild();
              spawnNew();
            } catch (err) {
              console.error(err);
              void shutdown(1);
            } finally {
              respawning = false;
            }
          });
        },
      },
    ],
  });
  process.on('SIGINT', onSignal);
  process.on('SIGTERM', onSignal);
  try {
    await ctx.watch();
  } catch (err) {
    console.error(err);
    await shutdown(1);
  }
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});

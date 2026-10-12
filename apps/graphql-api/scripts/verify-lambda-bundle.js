/* eslint-disable @typescript-eslint/no-var-requires, @typescript-eslint/no-require-imports */
const { build } = require('esbuild');
const { spawnSync } = require('node:child_process');
const { generateKeyPairSync } = require('node:crypto');
const { copyFileSync, mkdtempSync, rmSync } = require('node:fs');
const { tmpdir } = require('node:os');
const path = require('node:path');

const root = path.join(__dirname, '..');
const { privateKey } = generateKeyPairSync('rsa', {
  modulusLength: 2048,
  privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
  publicKeyEncoding: { type: 'spki', format: 'pem' },
});
const environment = {
  PATH: process.env.PATH,
  INFRA_ENV: 'prod',
  RUNNING_ENV: 'verification',
  DATABASE_URL: 'postgresql://local:local@127.0.0.1:5432/darun',
  FIREBASE_PROJECT_ID: 'verification',
  FIREBASE_PRIVATE_KEY: privateKey,
  FIREBASE_CLIENT_EMAIL: 'verification@example.com',
  MONGODB_URI: 'mongodb://127.0.0.1:27017/darun',
  CLOUDINARY_CLOUD_NAME: 'verification',
  CLOUDINARY_API_KEY: 'verification',
  CLOUDINARY_API_SECRET: 'verification',
  VOTE_IP_SALT: 'verification-vote-salt',
  CURSOR_SIGNATURE_SECRET: 'verification-cursor-secret',
};

function run(args) {
  const result = spawnSync(process.execPath, args, {
    cwd: root,
    env: environment,
    stdio: 'inherit',
    timeout: 30000,
  });
  if (result.error) throw result.error;
  if (result.status !== 0) throw new Error(`Bundle verification failed (exit ${result.status})`);
}

async function main() {
  const directory = mkdtempSync(path.join(tmpdir(), 'darun-schema-'));
  try {
    for (const name of [
      'graphql',
      'translation-worker',
      'product-description-worker',
      'product-research-worker',
      'job-recovery-tick',
    ]) {
      const file = path.join(directory, `${name}.js`);
      copyFileSync(path.join(root, '.build/lambda', `${name}.js`), file);
      run([
        '-e',
        `const assert = require('node:assert/strict');
         const bundle = require(process.argv[1]);
         assert.equal(typeof bundle.handler, 'function');
         console.log('Lambda handler verified:', process.argv[1]);
         process.exit(0);`,
        file,
      ]);
    }

    process.env.INFRA_ENV = 'local';
    const plugins = require('../esbuild.plugins.js');
    const outfile = path.join(directory, 'schema.cjs');
    await build({
      absWorkingDir: root,
      entryPoints: ['scripts/verify-schema.ts'],
      outfile,
      bundle: true,
      platform: 'node',
      target: 'node22',
      format: 'cjs',
      minify: true,
      keepNames: true,
      external: ['class-validator'],
      plugins,
      logLevel: 'error',
    });
    run([outfile]);
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
}

main().catch(error => {
  console.error(error);
  process.exit(1);
});

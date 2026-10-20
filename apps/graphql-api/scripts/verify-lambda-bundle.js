/* eslint-disable @typescript-eslint/no-require-imports */
const { build } = require('esbuild');
const { spawnSync } = require('node:child_process');
const { generateKeyPairSync } = require('node:crypto');
const { copyFileSync, mkdtempSync, rmSync, writeFileSync } = require('node:fs');
const { createRequire } = require('node:module');
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

function run(args, networkGuard) {
  const result = spawnSync(process.execPath, ['--require', networkGuard, ...args], {
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
    const networkGuard = path.join(directory, 'deny-network.cjs');
    writeFileSync(
      networkGuard,
      `
      const denyNetwork = () => { throw new Error('Network connections are forbidden during Lambda/schema verification'); };
      require('node:net').Socket.prototype.connect = denyNetwork;
      require('node:tls').connect = denyNetwork;
    `
    );
    for (const name of [
      'graphql',
      'translation-worker',
      'product-description-worker',
      'product-research-worker',
      'job-recovery-tick',
      'product-content-sync-worker',
    ]) {
      const file = path.join(directory, `${name}.js`);
      copyFileSync(path.join(root, '.build/lambda', `${name}.js`), file);
      run(
        [
          '-e',
          `const assert = require('node:assert/strict');
         const bundle = require(process.argv[1]);
         assert.equal(typeof bundle.handler, 'function');
         console.log('Lambda handler verified:', process.argv[1]);
         process.exit(0);`,
          file,
        ],
        networkGuard
      );
    }

    process.env.INFRA_ENV = 'local';
    const plugins = require('../esbuild.plugins.js');
    const providerRoot = path.resolve(root, '../../libs/shared/provider-graphql');
    const providerRequire = createRequire(path.join(providerRoot, 'package.json'));
    const { loadContext } = providerRequire('@graphql-codegen/cli');
    const { print } = require('graphql');
    const context = await loadContext(path.join(providerRoot, 'codegen.ts'));
    context.updateConfig({ cwd: providerRoot });
    const documents = await context.loadDocuments(context.getConfig().documents);
    const documentsFile = path.join(directory, 'consumer-documents.json');
    writeFileSync(
      documentsFile,
      JSON.stringify(
        documents.map(({ location, document }) => {
          if (!document) throw new Error(`Codegen document was not parsed: ${location}`);
          return { location, source: print(document) };
        })
      )
    );
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
      treeShaking: true,
      ignoreAnnotations: true,
      external: ['class-validator'],
      plugins,
      logLevel: 'error',
    });
    run([outfile, documentsFile, ...process.argv.slice(2)], networkGuard);
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
}

main().catch(error => {
  console.error(error);
  process.exit(1);
});

/* eslint-disable @typescript-eslint/no-var-requires, @typescript-eslint/no-require-imports */
const esbuild = require('esbuild');
const fs = require('fs');
const { createRequire } = require('module');
const os = require('os');
const path = require('path');

const root = path.join(__dirname, '..');
const outDir = path.join(root, '.build/reflect-check');
const plugins = require('../esbuild.plugins.js');

process.env.INFRA_ENV = 'prod';
process.env.RUNNING_ENV = 'production';
process.env.DATABASE_URL = 'postgresql://local:local@127.0.0.1:5432/darun';
process.env.FIREBASE_PROJECT_ID = 'local';
process.env.FIREBASE_PRIVATE_KEY =
  process.env.FIREBASE_PRIVATE_KEY ||
  (fs.existsSync('/tmp/darun-test-key.pem')
    ? fs.readFileSync('/tmp/darun-test-key.pem', 'utf8')
    : '-----BEGIN PRIVATE KEY-----\nMIIB\n-----END PRIVATE KEY-----\n');
process.env.FIREBASE_CLIENT_EMAIL = 'local@example.com';
process.env.MONGODB_URI = 'mongodb://127.0.0.1:27017/darun';
process.env.CLOUDINARY_CLOUD_NAME = 'local';
process.env.CLOUDINARY_API_KEY = 'local';
process.env.CLOUDINARY_API_SECRET = 'local';
process.env.OPEN_ROUTER_API_KEY = 'local';
process.env.CURSOR_SIGNATURE_SECRET = 'local-cursor-secret';
process.env.VOTE_IP_SALT = 'local-vote-salt';
process.env.SENTRY_AUTH_TOKEN = '';

const log = (message, data = {}) => {
  console.log(`[verify] ${message}`, data);
};

const inspect = (filePath, label) => {
  const source = fs.readFileSync(filePath, 'utf8');
  const head = source.slice(0, 800);
  const info = {
    label,
    hasRequireReflect: /require\(['"]reflect-metadata['"]\)/.test(head),
    hasIifeWrap: /^\(function \(\)/.test(head),
    hasModuleScopedVarReflect: /(?:^|\n)var Reflect;/.test(head.slice(0, 200)),
    headPreview: head.slice(0, 180),
  };
  log('bundle_inspected', info);
  return info;
};

const loadInIsolation = filePath => {
  const isolatedRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'darun-lambda-bundle-'));
  const isolatedFile = path.join(isolatedRoot, 'graphql.js');
  fs.copyFileSync(filePath, isolatedFile);

  const abs = path.resolve(isolatedFile);
  const req = createRequire(abs);
  let loadError = null;
  let ownKeysType = null;
  let decorateType = null;

  try {
    req(abs);
    ownKeysType = typeof Reflect.ownKeys;
    decorateType = typeof Reflect.decorate;
  } catch (error) {
    loadError = `${error.name}: ${error.message}`;
    ownKeysType = typeof Reflect.ownKeys;
    decorateType = typeof Reflect.decorate;
  } finally {
    fs.rmSync(isolatedRoot, { recursive: true, force: true });
  }

  return { loadError, ownKeysType, decorateType };
};

const commonBuild = {
  entryPoints: [path.join(root, 'src/functions/graphql.ts')],
  bundle: true,
  platform: 'node',
  target: 'node22',
  format: 'cjs',
  minify: true,
  keepNames: true,
  sourcemap: false,
  external: ['class-validator'],
};

const buildBrokenBanner = async () => {
  const brokenOut = path.join(outDir, 'broken/graphql.js');
  fs.mkdirSync(path.dirname(brokenOut), { recursive: true });
  await esbuild.build({
    ...commonBuild,
    outfile: brokenOut,
    banner: { js: "require('reflect-metadata');" },
    plugins: plugins.filter(p => p.name !== 'inline-reflect-metadata'),
  });
  return brokenOut;
};

const buildLeakingInline = async () => {
  const leakOut = path.join(outDir, 'leak/graphql.js');
  fs.mkdirSync(path.dirname(leakOut), { recursive: true });
  const reflectMetadataSource = fs.readFileSync(require.resolve('reflect-metadata'), 'utf8');
  await esbuild.build({
    ...commonBuild,
    outfile: leakOut,
    banner: { js: `${reflectMetadataSource}\n` },
    plugins: plugins.filter(p => p.name !== 'inline-reflect-metadata'),
  });
  return leakOut;
};

const buildFixedBundle = async () => {
  const outFile = path.join(outDir, 'fixed/graphql.js');
  fs.mkdirSync(path.dirname(outFile), { recursive: true });
  await esbuild.build({
    ...commonBuild,
    outfile: outFile,
    plugins,
  });
  return outFile;
};

(async () => {
  fs.rmSync(outDir, { recursive: true, force: true });
  fs.mkdirSync(outDir, { recursive: true });
  log('build_start', { root });

  const brokenPath = await buildBrokenBanner();
  const brokenInfo = inspect(brokenPath, 'broken-banner-require');
  const brokenLoad = loadInIsolation(brokenPath);
  log('broken_load_result', brokenLoad);

  const leakPath = await buildLeakingInline();
  const leakInfo = inspect(leakPath, 'inline-without-iife');
  const leakLoad = loadInIsolation(leakPath);
  log('leak_load_result', leakLoad);

  const fixedPath = await buildFixedBundle();
  const fixedInfo = inspect(fixedPath, 'fixed-iife-inline');
  const fixedLoad = loadInIsolation(fixedPath);
  log('fixed_load_result', fixedLoad);

  const leakSource = fs.readFileSync(leakPath, 'utf8');
  const leakHasTopLevelVarReflect = /(?:^|\n)var Reflect;/.test(leakSource.slice(0, 3000));

  const reproducedMissingModule =
    brokenInfo.hasRequireReflect &&
    typeof brokenLoad.loadError === 'string' &&
    brokenLoad.loadError.includes("Cannot find module 'reflect-metadata'");

  // Synthetic module-scope shadow check (exact class of Lambda crash).
  const shadowDir = fs.mkdtempSync(path.join(os.tmpdir(), 'darun-reflect-shadow-'));
  const shadowFile = path.join(shadowDir, 'shadow.js');
  fs.writeFileSync(
    shadowFile,
    `${fs.readFileSync(require.resolve('reflect-metadata'), 'utf8')}\n` +
      `module.exports = { ownKeysType: typeof Reflect.ownKeys, keys: Reflect.ownKeys({ a: 1 }) };\n`
  );
  let shadowError = null;
  let shadowResult = null;
  try {
    shadowResult = createRequire(shadowFile)(shadowFile);
  } catch (error) {
    shadowError = `${error.name}: ${error.message}`;
  }
  fs.rmSync(shadowDir, { recursive: true, force: true });
  log('synthetic_shadow_result', { shadowError, shadowResult });

  const reproducedOwnKeysShadow =
    !leakInfo.hasIifeWrap &&
    leakHasTopLevelVarReflect &&
    typeof shadowError === 'string' &&
    shadowError.includes('Reflect.ownKeys');

  const schemaFailurePatterns = [
    "Cannot find module 'reflect-metadata'",
    'Reflect.ownKeys',
    'Unable to infer GraphQL type',
    'Class extends value undefined',
    "Cannot read properties of undefined (reading 'name')",
    'Generating schema error',
  ];
  const fixedSchemaError =
    typeof fixedLoad.loadError === 'string' &&
    schemaFailurePatterns.some(pattern => fixedLoad.loadError.includes(pattern));

  const fixedPastReflect =
    fixedInfo.hasIifeWrap &&
    !fixedInfo.hasRequireReflect &&
    fixedLoad.decorateType === 'function' &&
    fixedLoad.ownKeysType === 'function' &&
    !fixedSchemaError;

  const fixedSchemaLoaded = fixedPastReflect && fixedLoad.loadError === null;

  log('verdict', {
    reproducedMissingModule,
    reproducedOwnKeysShadow,
    leakHasTopLevelVarReflect,
    fixedPastReflect,
    fixedSchemaLoaded,
    fixedLoadError: fixedLoad.loadError,
  });

  if (!reproducedMissingModule) {
    console.error('[verify] FAILED: could not reproduce missing reflect-metadata');
    process.exit(1);
  }
  if (!reproducedOwnKeysShadow) {
    console.error('[verify] FAILED: could not confirm top-level var Reflect hazard');
    process.exit(1);
  }
  if (!fixedPastReflect) {
    console.error('[verify] FAILED: fixed bundle still fails GraphQL schema/bootstrap');
    console.error(fixedLoad);
    process.exit(1);
  }
  if (!fixedSchemaLoaded) {
    console.error('[verify] FAILED: fixed bundle loaded but schema init did not complete cleanly');
    console.error(fixedLoad);
    process.exit(1);
  }

  console.log('[verify] PASSED: reproduced packaging failure and confirmed IIFE + schema load locally');
})().catch(error => {
  log('build_crash', { message: String(error && error.message ? error.message : error) });
  console.error(error);
  process.exit(1);
});

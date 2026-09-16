const { build } = require('esbuild');
const { rm, mkdir } = require('fs/promises');

process.env.INFRA_ENV ??= 'local';
const plugins = require('../esbuild.plugins.js');

async function main() {
  const outDir = '.build/lambda';
  await rm(outDir, { recursive: true, force: true });
  await mkdir(outDir, { recursive: true });

  await build({
    entryPoints: ['src/functions/graphql.ts'],
    bundle: true,
    platform: 'node',
    target: 'node22',
    format: 'cjs',
    outfile: `${outDir}/graphql.js`,
    minify: true,
    keepNames: true,
    sourcemap: true,
    sourcesContent: false,
    treeShaking: true,
    ignoreAnnotations: true,
    external: ['class-validator'],
    plugins,
    logLevel: 'info',
  });

  await build({
    entryPoints: ['src/functions/translation-worker.ts'],
    bundle: true,
    platform: 'node',
    target: 'node22',
    format: 'cjs',
    outfile: `${outDir}/translation-worker.js`,
    minify: true,
    keepNames: true,
    sourcemap: true,
    sourcesContent: false,
    treeShaking: true,
    ignoreAnnotations: true,
    external: ['class-validator'],
    plugins,
    logLevel: 'info',
  });

  await build({
    entryPoints: ['src/functions/product-description-worker.ts'],
    bundle: true,
    platform: 'node',
    target: 'node22',
    format: 'cjs',
    outfile: `${outDir}/product-description-worker.js`,
    minify: true,
    keepNames: true,
    sourcemap: true,
    sourcesContent: false,
    treeShaking: true,
    ignoreAnnotations: true,
    external: ['class-validator'],
    plugins,
    logLevel: 'info',
  });

  console.log(`Lambda bundles built to ${outDir}`);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});

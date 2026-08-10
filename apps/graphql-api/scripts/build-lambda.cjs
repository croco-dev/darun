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

  console.log(`Lambda bundle built to ${outDir}/graphql.js`);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});

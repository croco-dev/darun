import { validateProductionEnvironment, runCommand, prepareProductionDeployment } from './predeploy-prod.mjs';

try {
  validateProductionEnvironment();
  for (const script of ['check:migrations', 'build:lambda', 'verify:lambda']) {
    runCommand('pnpm', ['run', script]);
  }
  prepareProductionDeployment();
  runCommand('sst', ['deploy', '--stage', 'prod']);
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
}

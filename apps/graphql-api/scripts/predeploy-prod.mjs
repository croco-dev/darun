import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

export function validateProductionEnvironment() {
  if (process.env.NODE_ENV === 'test') {
    throw new Error('NODE_ENV=test skips migrations and cannot be used for production deployment');
  }
  for (const name of ['INFRA_ENV', 'RUNNING_ENV']) {
    if (process.env[name] !== 'prod') {
      throw new Error(`${name} must be prod before production deployment`);
    }
  }
  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL is required before production deployment');
  }
}

export function runCommand(command, args) {
  const result = spawnSync(command, args, { stdio: 'inherit' });
  if (result.error || result.signal || result.status !== 0) {
    throw new Error(`Production deployment stopped: ${command} ${args.join(' ')} failed`);
  }
}

export function prepareProductionDeployment() {
  validateProductionEnvironment();
  runCommand('pnpm', ['run', 'migrate']);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  try {
    prepareProductionDeployment();
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}

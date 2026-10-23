import { execFileSync } from 'node:child_process';
import { appendFileSync } from 'node:fs';

// Run only after acquiring the deployment job's concurrency group.
const { GITHUB_EVENT_NAME, GITHUB_SHA, GITHUB_REPOSITORY, GITHUB_OUTPUT, ALLOW_ROLLBACK } = process.env;
if (!GITHUB_SHA || !GITHUB_REPOSITORY || !GITHUB_OUTPUT) {
  throw new Error('Deployment revision, repository and output file are required');
}
if (!['push', 'workflow_dispatch', 'repository_dispatch'].includes(GITHUB_EVENT_NAME)) {
  throw new Error('Unsupported deployment event');
}
const latest = execFileSync(
  'gh',
  ['api', '--method', 'GET', `repos/${GITHUB_REPOSITORY}/commits/trunk`, '--jq', '.sha'],
  {
    encoding: 'utf8',
  }
).trim();
if (!/^[a-f0-9]{40}$/.test(latest) || !/^[a-f0-9]{40}$/.test(GITHUB_SHA)) {
  throw new Error('GitHub returned an invalid deployment revision');
}
const rollback = GITHUB_EVENT_NAME === 'workflow_dispatch' && ALLOW_ROLLBACK === 'true';
const deploy = GITHUB_SHA === latest || rollback;
console.log(
  `${deploy ? 'Deploy' : 'Skip stale deployment'}: event=${GITHUB_EVENT_NAME}, revision=${GITHUB_SHA}, trunk=${latest}, explicitRollback=${rollback}`
);
appendFileSync(GITHUB_OUTPUT, `deploy=${deploy}\n`);

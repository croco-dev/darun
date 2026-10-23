import { appendFileSync } from 'node:fs';

// Run only after acquiring the deployment job's concurrency group.
const { GITHUB_EVENT_NAME, GITHUB_SHA, GITHUB_REPOSITORY, GITHUB_OUTPUT, ALLOW_ROLLBACK, GH_TOKEN } = process.env;
if (!GITHUB_SHA || !GITHUB_REPOSITORY || !GITHUB_OUTPUT || !GH_TOKEN) {
  throw new Error('Deployment revision, repository, output file and GitHub token are required');
}
if (!['push', 'workflow_dispatch', 'repository_dispatch'].includes(GITHUB_EVENT_NAME)) {
  throw new Error('Unsupported deployment event');
}
const response = await fetch(`https://api.github.com/repos/${GITHUB_REPOSITORY}/commits/trunk`, {
  headers: { Authorization: `Bearer ${GH_TOKEN}`, Accept: 'application/vnd.github+json' },
  redirect: 'error',
  signal: AbortSignal.timeout(30_000),
});
if (!response.ok) throw new Error(`Cannot read current trunk revision: HTTP ${response.status}`);
const { sha: latest } = await response.json();
if (typeof latest !== 'string' || !/^[a-f0-9]{40}$/.test(latest) || !/^[a-f0-9]{40}$/.test(GITHUB_SHA)) {
  throw new Error('GitHub returned an invalid deployment revision');
}
const rollback = GITHUB_EVENT_NAME === 'workflow_dispatch' && ALLOW_ROLLBACK === 'true';
const deploy = GITHUB_SHA === latest || rollback;
console.log(
  `${deploy ? 'Deploy' : 'Skip stale deployment'}: event=${GITHUB_EVENT_NAME}, revision=${GITHUB_SHA}, trunk=${latest}, explicitRollback=${rollback}`
);
appendFileSync(GITHUB_OUTPUT, `deploy=${deploy}\n`);

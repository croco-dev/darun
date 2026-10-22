import 'reflect-metadata';
import type { LlmClient } from '@darun/utils-llm';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { resolve } from 'node:path';
import { test } from 'node:test';
import { LlmTranslationProvider } from '../../libs/translation/datasource/src/adapters/LlmTranslationProvider';
import { runLiveDescriptionEvaluations, runLiveTranslationEvaluations, type TranslationFixture } from './run';

const fixtures: TranslationFixture[] = JSON.parse(
  readFileSync(resolve(__dirname, 'fixtures/translation-fixtures.json'), 'utf8')
);

async function captureReports(run: () => Promise<number>) {
  const messages: string[] = [];
  const original = console.log;
  console.log = message => messages.push(String(message));
  try {
    const failures = await run();
    const reports = messages.filter(message => message.startsWith('{')).map(message => JSON.parse(message));
    return { failures, reports };
  } finally {
    console.log = original;
  }
}

test('default and explicit deterministic stay offline with keys; missing-key live is SKIPPED', () => {
  const directory = mkdtempSync(resolve(tmpdir(), 'darun-eval-network-guard-'));
  const guard = resolve(directory, 'guard.cjs');
  writeFileSync(
    guard,
    `
    let attempts = 0;
    const deny = () => { attempts++; throw new Error('REMOTE_CALL_DENIED'); };
    globalThis.fetch = deny;
    require('node:http').request = deny;
    require('node:https').request = deny;
    process.on('exit', () => console.log('NETWORK_ATTEMPTS=' + attempts));
  `
  );
  try {
    const cases = [
      { args: [], key: 'synthetic-not-a-credential', expected: '0 remote calls were made' },
      { args: ['--mode=deterministic'], key: 'synthetic-not-a-credential', expected: '0 remote calls were made' },
      { args: ['--mode=manual-live'], key: '', expected: '[Manual-live] SKIPPED' },
      { args: ['--mode=manual-live'], key: '   ', expected: '[Manual-live] SKIPPED' },
    ];
    for (const scenario of cases) {
      const result = spawnSync(
        process.execPath,
        [require.resolve('tsx/cli'), resolve(__dirname, 'run.ts'), ...scenario.args],
        {
          encoding: 'utf8',
          timeout: 20_000,
          env: {
            ...process.env,
            NODE_OPTIONS: `--require ${guard}`,
            OPEN_ROUTER_API_KEY: scenario.key,
            OPEN_ROUTER_ENDPOINT: 'https://remote-calls-must-not-happen.invalid',
          },
        }
      );
      assert.equal(result.status, 0, result.stderr);
      assert.match(result.stdout, /NETWORK_ATTEMPTS=0/);
      assert.ok(result.stdout.includes(scenario.expected), result.stdout);
      assert.match(result.stdout, /"modelStatus": "NOT_EXECUTED"/);
      assert.match(result.stdout, /"meaningStatus": "NOT_ASSESSED"/);
    }
    for (const args of [
      ['--mode=bogus'],
      ['--live'],
      ['--mode=manual-live', '--mode=deterministic'],
      ['--mode=deterministic', '--mode=manual-live'],
    ]) {
      const result = spawnSync(process.execPath, [require.resolve('tsx/cli'), resolve(__dirname, 'run.ts'), ...args], {
        encoding: 'utf8',
        timeout: 20_000,
        env: { ...process.env, NODE_OPTIONS: `--require ${guard}`, OPEN_ROUTER_API_KEY: 'synthetic-not-a-credential' },
      });
      assert.equal(result.status, 1, result.stderr);
      assert.match(result.stderr, /Use exactly one/);
      assert.match(result.stdout, /NETWORK_ATTEMPTS=0/);
    }
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});

test('real translation provider uses local transport and emits final source/model/version pairs without a semantic pass', async () => {
  let completions = 0;
  const localClient = {
    getConfig: async () => ({ model: 'offline-transport-model' }),
    completion: async (_model: string, messages: Array<{ role: string; content: string }>) => {
      completions++;
      const prompt = messages[1]!.content;
      // These machine-consumed prompt markers distinguish the actual writer
      // and audit paths. Stage markers exercise final-output wiring, never
      // semantic quality: deliberately distinguish writer from reviewer.
      const reviewing = prompt.includes('[영어 번역 초안]\n');
      const text = reviewing ? prompt.split('[영어 번역 초안]\n')[1]! : prompt.split('번역할 원문:\n')[1]!;
      return {
        content: reviewing
          ? text.replace('synthetic writer stage', 'synthetic reviewer stage')
          : text.replace('현재는 한국어만 지원하며', 'synthetic writer stage'),
      };
    },
  };
  const provider = new LlmTranslationProvider(localClient as unknown as LlmClient);
  const { failures, reports } = await captureReports(() =>
    runLiveTranslationEvaluations(provider, {
      model: 'offline-transport-model',
      promptVersion: 'fallback-version',
    })
  );
  assert.equal(failures, 0);
  assert.equal(
    completions,
    fixtures.reduce((count, fixture) => count + (fixture.mode === 'label' ? 1 : 2), 0)
  );
  assert.deepEqual(
    reports.map(report => report.fixture),
    fixtures.map(fixture => fixture.id)
  );
  for (const [index, fixture] of fixtures.entries()) {
    const report = reports[index];
    assert.equal(report.source, fixture.koreanText);
    const expectedFinal = fixture.koreanText.replace('현재는 한국어만 지원하며', 'synthetic reviewer stage');
    assert.equal(report.finalTranslation, expectedFinal);
    assert.equal(report.model, 'offline-transport-model');
    assert.ok(report.promptVersion && report.promptVersion !== 'fallback-version');
    assert.equal(report.formatStatus, 'PASSED');
    assert.equal(report.formatFailure, null);
    assert.equal(report.meaningStatus, 'HUMAN_REVIEW_REQUIRED');
  }
});

test('damaged final output and provider failures retain comparison data instead of concealing errors', async () => {
  const { failures, reports } = await captureReports(() =>
    runLiveTranslationEvaluations(
      {
        translateSingle: async request => {
          if (request.entityId === 'brand-url-markdown') {
            return {
              translatedText: request.koreanText.replace(
                'https://notion.so/darun-team',
                'https://figma.com/file/darun'
              ),
              sourceHash: 'synthetic-hash',
              model: 'damaged-output-model',
              promptVersion: 'damaged-output-version',
            };
          }
          throw new Error('synthetic reviewer transport failure');
        },
      },
      { model: 'configured-model', promptVersion: 'configured-version' }
    )
  );
  assert.equal(failures, fixtures.length);
  const damaged = reports.find(report => report.fixture === 'brand-url-markdown');
  assert.equal(damaged.finalTranslation.match(/\]\(([^)]+)\)/)?.[1], 'https://figma.com/file/darun');
  assert.equal(damaged.source, fixtures.find(fixture => fixture.id === 'brand-url-markdown')!.koreanText);
  assert.equal(damaged.model, 'damaged-output-model');
  assert.equal(damaged.promptVersion, 'damaged-output-version');
  assert.match(damaged.formatFailure, /Markdown structure/);
  const rejected = reports.find(report => report.fixture === 'hedge-preservation');
  assert.equal(rejected.finalTranslation, null);
  assert.equal(rejected.model, 'configured-model');
  assert.equal(rejected.promptVersion, 'configured-version');
  assert.match(rejected.formatFailure, /synthetic reviewer transport failure/);
  assert.ok(reports.every(report => report.meaningStatus === 'HUMAN_REVIEW_REQUIRED'));
});

test('description writer/reviewer outputs and validation failures remain human-comparable', async () => {
  let completions = 0;
  const backed = { text: '합성 소개', evidenceRefs: ['product:summary'], bullets: [], quote: false, link: null };
  const document = {
    intro: backed,
    sections: [{ title: '합성 특징', paragraphs: [backed] }],
    recommendedIf: [],
    limitations: [],
    closing: backed,
  };
  const localClient = {
    getConfig: async () => ({ model: 'offline-description-model', thinkingLevel: null }),
    completion: async () => {
      completions++;
      return {
        content: JSON.stringify(
          completions % 2 === 1
            ? document
            : {
                ...document,
                intro: { ...backed, text: '합성 최종 Reviewer 출력' },
              }
        ),
      };
    },
  };
  const { failures, reports } = await captureReports(() =>
    runLiveDescriptionEvaluations(localClient as unknown as LlmClient)
  );
  assert.equal(failures, 0);
  assert.equal(completions, reports.length * 2);
  for (const report of reports) {
    assert.ok(report.source.items.length);
    assert.deepEqual(report.writerDraft, document);
    assert.deepEqual(report.finalDocument, {
      ...document,
      intro: { ...backed, text: '합성 최종 Reviewer 출력' },
    });
    assert.ok(report.writerVersion && report.reviewerVersion);
    assert.equal(report.meaningStatus, 'HUMAN_REVIEW_REQUIRED');
  }
  const rejected = await captureReports(() =>
    runLiveDescriptionEvaluations({
      ...localClient,
      completion: async () => ({ content: '{broken' }),
    } as unknown as LlmClient)
  );
  assert.equal(rejected.failures, reports.length);
  assert.ok(rejected.reports.every(report => report.finalDocument === null && report.formatFailure));
});

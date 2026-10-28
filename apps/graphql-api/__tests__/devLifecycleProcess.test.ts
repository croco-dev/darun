import { expect, it } from 'vitest';
import { spawn } from 'node:child_process';
import { EventEmitter, once } from 'node:events';
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

it('실제 자식을 최신 번들로 재시작하고 종료 중 재빌드에는 부모와 자식 모두 종료한다', async () => {
  const directory = mkdtempSync(join(tmpdir(), 'darun-dev-lifecycle-'));
  mkdirSync(join(directory, '.build'));
  const writeBundle = (version: number) =>
    writeFileSync(
      join(directory, '.build/local.cjs'),
      `
        process.on('SIGTERM', () => process.send({ event: 'term', version: ${version}, pid: process.pid }));
        process.on('message', () => process.exit(0));
        setInterval(() => {}, 1000);
        process.send({ event: 'started', version: ${version}, pid: process.pid });
      `
    );
  const devScript = resolve(__dirname, '../scripts/dev.cjs');
  const parent = spawn(
    process.execPath,
    [
      '-e',
      `
        const Module = require('node:module');
        const { spawn } = require('node:child_process');
        const originalLoad = Module._load;
        let onEnd, child, disposeDone;
        Module._load = function(id, ...args) {
          if (id === '../esbuild.plugins.js') return [];
          if (id === 'child_process') return { spawn(command, args, options) {
            child = spawn(command, args, { ...options, stdio: ['ignore', 'ignore', 'inherit', 'ipc'] });
            process.send({ event: 'spawn', pid: child.pid });
            child.on('message', message => process.send(message));
            child.on('exit', () => process.send({ event: 'child-exit' }));
            return child;
          }};
          if (id === 'esbuild') return { context: async options => {
            options.plugins.at(-1).setup({ onEnd(callback) { onEnd = callback; } });
            return {
              watch: async () => process.send({ event: 'watching' }),
              dispose: () => new Promise(resolve => {
                disposeDone = resolve;
                process.send({ event: 'disposing' });
              })
            };
          }};
          return originalLoad.call(this, id, ...args);
        };
        process.on('message', async message => {
          if (message.command === 'build') {
            await onEnd({ errors: message.errors || [] });
            process.send({ event: 'built', id: message.id });
          }
          if (message.command === 'release-child') child.send('exit');
          if (message.command === 'release-dispose') disposeDone();
        });
        require(${JSON.stringify(devScript)});
      `,
    ],
    { cwd: directory, env: { PATH: process.env.PATH }, stdio: ['ignore', 'ignore', 'pipe', 'ipc'] }
  );
  interface Message {
    event: string;
    pid?: number;
    version?: number;
    id?: number;
  }
  const messages: Message[] = [];
  const pids: number[] = [];
  const events = new EventEmitter();
  let stderr = '';
  parent.stderr!.on('data', data => {
    stderr += data;
  });
  parent.on('message', raw => {
    const message = raw as Message;
    messages.push(message);
    if (message.event === 'spawn' && message.pid) pids.push(message.pid);
    events.emit('message');
  });
  async function receive(event: string, id?: number) {
    const signal = AbortSignal.timeout(5_000);
    while (true) {
      const index = messages.findIndex(message => message.event === event && (id === undefined || message.id === id));
      if (index >= 0) return messages.splice(index, 1)[0];
      await once(events, 'message', { signal });
    }
  }
  const exited = once(parent, 'exit');
  try {
    await receive('watching');
    writeBundle(1);
    parent.send({ command: 'build', id: 1 });
    expect((await receive('started')).version).toBe(1);
    await receive('built', 1);
    parent.send({ command: 'build', id: 2, errors: ['invalid source'] });
    await receive('built', 2);
    expect(pids).toHaveLength(1);

    writeBundle(2);
    parent.send({ command: 'build', id: 3 });
    await receive('term');
    writeBundle(3);
    parent.send({ command: 'build', id: 4 });
    await receive('built', 4);
    parent.send({ command: 'release-child' });
    await receive('child-exit');
    expect((await receive('started')).version).toBe(3);
    await receive('built', 3);
    expect(pids).toHaveLength(2);

    parent.send({ command: 'build', id: 5 });
    await receive('term');
    parent.kill('SIGTERM');
    await receive('disposing');
    parent.kill('SIGINT');
    parent.send({ command: 'release-child' });
    await receive('child-exit');
    await receive('built', 5);
    parent.send({ command: 'build', id: 6 });
    await receive('built', 6);
    parent.send({ command: 'release-dispose' });
    expect(await exited).toEqual([0, null]);
    expect(stderr).toBe('');
    expect(pids).toHaveLength(2);
    for (const pid of pids) expect(() => process.kill(pid, 0)).toThrowError(/ESRCH/);
  } finally {
    // Only this fixture's recorded children and parent are cleanup targets, including a failed regression run.
    for (const pid of pids) {
      try {
        process.kill(pid, 'SIGKILL');
      } catch (error) {
        if ((error as NodeJS.ErrnoException).code !== 'ESRCH') throw error;
      }
    }
    if (parent.exitCode === null && parent.signalCode === null) {
      parent.kill('SIGKILL');
      await exited;
    }
    rmSync(directory, { recursive: true, force: true });
  }
}, 15_000);

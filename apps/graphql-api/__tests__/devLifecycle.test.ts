import { afterEach, describe, expect, it, vi } from 'vitest';
import { EventEmitter } from 'node:events';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { runInNewContext } from 'node:vm';

const source = readFileSync(resolve(__dirname, '../scripts/dev.cjs'), 'utf8');

function deferred() {
  let resolve!: () => void;
  const promise = new Promise<void>(done => {
    resolve = done;
  });
  return { promise, resolve };
}

async function flush() {
  for (let i = 0; i < 20; i++) await Promise.resolve();
}

async function fixture(options: { pendingWatch?: boolean; pendingDispose?: boolean } = {}) {
  const watcher = deferred();
  const disposal = deferred();
  const process = Object.assign(new EventEmitter(), { env: {}, execPath: '/trusted/runtime/node', exit: vi.fn() });
  const children: Array<EventEmitter & { kill: ReturnType<typeof vi.fn> }> = [];
  const spawn = vi.fn((..._args: unknown[]) => {
    const child = Object.assign(new EventEmitter(), { kill: vi.fn(() => true) });
    children.push(child);
    return child;
  });
  let onEnd!: (result: { errors: unknown[] }) => unknown;
  const ctx = {
    watch: vi.fn(() => (options.pendingWatch ? watcher.promise : Promise.resolve())),
    dispose: vi.fn(() => (options.pendingDispose ? disposal.promise : Promise.resolve())),
  };
  const console = { error: vi.fn() };
  runInNewContext(source, {
    require(id: string) {
      if (id === 'esbuild')
        return {
          context: async (config: { plugins: Array<{ setup: (build: unknown) => void }> }) => {
            config.plugins.at(-1)!.setup({
              onEnd(callback: typeof onEnd) {
                onEnd = callback;
              },
            });
            return ctx;
          },
        };
      if (id === 'child_process') return { spawn };
      if (id === 'node:fs') return { existsSync: () => false };
      if (id === 'node:process') return { loadEnvFile: vi.fn() };
      if (id === '../esbuild.plugins.js') return [];
      throw new Error(`Unexpected require: ${id}`);
    },
    process,
    console,
    setTimeout,
    clearTimeout,
  });
  await flush();
  return {
    process,
    children,
    spawn,
    ctx,
    console,
    watcher,
    disposal,
    build: (errors: unknown[] = []) => onEnd({ errors }),
  };
}

afterEach(() => {
  vi.useRealTimers();
});

describe('개발 서버 프로세스 수명', () => {
  it('현재 Node의 절대 경로로 자식을 실행해 PATH 검색에 의존하지 않는다', async () => {
    const f = await fixture();
    await f.build();
    expect(f.spawn.mock.calls[0][0]).toBe('/trusted/runtime/node');
    f.process.emit('SIGTERM');
    f.children[0].emit('exit', 0);
    await flush();
  });

  it.each(['SIGINT', 'SIGTERM'])('재시작 대기 중 %s 이후에는 새 자식을 만들지 않는다', async signal => {
    const f = await fixture({ pendingDispose: true });
    await f.build();
    const restart = f.build();
    expect(f.children[0].kill).toHaveBeenCalled();

    f.process.emit(signal);
    f.process.emit(signal);
    f.children[0].emit('exit', 0);
    await restart;
    await f.build();
    expect(f.spawn).toHaveBeenCalledTimes(1);
    expect(f.process.exit).not.toHaveBeenCalled();

    f.disposal.resolve();
    await flush();
    expect(f.ctx.dispose).toHaveBeenCalledTimes(1);
    expect(f.process.exit).toHaveBeenCalledExactlyOnceWith(0);
    expect(f.process.listenerCount('SIGINT')).toBe(0);
    expect(f.process.listenerCount('SIGTERM')).toBe(0);
  });

  it('watch 준비 중에도 종료 신호를 처리하고 자식 종료까지 기다린다', async () => {
    const f = await fixture({ pendingWatch: true });
    await f.build();
    f.process.emit('SIGTERM');
    await flush();
    expect(f.children[0].kill).toHaveBeenCalled();
    expect(f.process.exit).not.toHaveBeenCalled();
    f.children[0].emit('exit', 0);
    f.watcher.resolve();
    await flush();
    expect(f.process.exit).toHaveBeenCalledExactlyOnceWith(0);
  });

  it('연속 빌드를 합치고 컴파일 실패 뒤에도 한 자식으로 복구한다', async () => {
    const f = await fixture();
    await f.build();
    await f.build(['compile failed']);
    expect(f.children[0].kill).not.toHaveBeenCalled();
    const restart = f.build();
    await f.build();
    expect(f.spawn).toHaveBeenCalledTimes(1);
    f.children[0].emit('exit', 0);
    await restart;
    expect(f.spawn).toHaveBeenCalledTimes(2);
    const secondRestart = f.build();
    f.children[1].emit('exit', 0);
    await secondRestart;
    expect(f.spawn).toHaveBeenCalledTimes(3);
    f.process.emit('SIGINT');
    f.children[2].emit('exit', 0);
    await flush();
    expect(f.process.exit).toHaveBeenCalledExactlyOnceWith(0);
  });

  it('정상 종료를 무시하는 자식을 강제 종료한 뒤에만 종료를 완료한다', async () => {
    vi.useFakeTimers();
    const f = await fixture();
    await f.build();
    f.process.emit('SIGTERM');
    f.process.emit('SIGINT');
    await vi.advanceTimersByTimeAsync(3_000);
    expect(f.children[0].kill).toHaveBeenLastCalledWith('SIGKILL');
    expect(f.process.exit).not.toHaveBeenCalled();
    f.children[0].emit('exit', null, 'SIGKILL');
    await flush();
    expect(f.process.exit).toHaveBeenCalledExactlyOnceWith(0);
    expect(vi.getTimerCount()).toBe(0);
  });

  it('강제 종료 뒤에도 exit가 없으면 성공으로 처리하지 않는다', async () => {
    vi.useFakeTimers();
    const f = await fixture();
    await f.build();
    f.process.emit('SIGTERM');
    await vi.advanceTimersByTimeAsync(4_000);
    expect(f.children[0].kill).toHaveBeenLastCalledWith('SIGKILL');
    expect(f.process.exit).toHaveBeenCalledExactlyOnceWith(1);
    expect(f.console.error).toHaveBeenCalled();
  });

  it('watcher 정리 실패를 자식 종료 뒤 실패 코드로 반환한다', async () => {
    const f = await fixture();
    await f.build();
    f.ctx.dispose.mockRejectedValueOnce(new Error('dispose failed'));
    f.process.emit('SIGTERM');
    f.children[0].emit('exit', 0);
    await flush();
    expect(f.process.exit).toHaveBeenCalledExactlyOnceWith(1);
    expect(f.console.error).toHaveBeenCalled();
  });

  it('자식을 시작하지 못하면 watcher를 정리하고 실패로 종료한다', async () => {
    const f = await fixture();
    await f.build();
    f.children[0].emit('error', new Error('spawn failed'));
    await flush();
    expect(f.ctx.dispose).toHaveBeenCalledTimes(1);
    expect(f.process.exit).toHaveBeenCalledExactlyOnceWith(1);
  });

  it('watcher 정리가 멈춰도 자식 정리 후 제한 시간에 실패로 종료한다', async () => {
    vi.useFakeTimers();
    const f = await fixture({ pendingDispose: true });
    await f.build();
    f.process.emit('SIGTERM');
    f.children[0].emit('exit', 0);
    await vi.advanceTimersByTimeAsync(5_000);
    expect(f.process.exit).toHaveBeenCalledExactlyOnceWith(1);
    expect(f.console.error).toHaveBeenCalled();
    f.disposal.resolve();
    await flush();
    expect(f.process.exit).toHaveBeenCalledTimes(1);
  });
});

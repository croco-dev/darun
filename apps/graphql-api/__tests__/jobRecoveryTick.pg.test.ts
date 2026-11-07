import 'reflect-metadata';
import { ImageDeleterToken } from '@darun/images-domain';
import { productDescriptionJobs, productResearchJobs } from '@darun/products-datasource';
import { ProductDescriptionQueueService, ProductResearchQueueService } from '@darun/products-service';
import { DrizzleToken } from '@darun/provider-database';
import { SearchableProductRepositoryToken } from '@darun/search-domain';
import { translationJobs } from '@darun/translation-datasource';
import { TranslationQueueService } from '@darun/translation-service';
import type { Handler } from 'aws-lambda';
import { eq, sql } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/postgres-js';
import { migrate } from 'drizzle-orm/postgres-js/migrator';
import postgres from 'postgres';
import { Container } from 'typedi';
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, onTestFinished, vi } from 'vitest';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { connect, createServer, type Socket } from 'node:net';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { createSecureContext, TLSSocket } from 'node:tls';
import { productContentSyncIntents } from '../../../libs/products/datasource/src/entities/ProductContentSyncIntentSchema';
import { products } from '../../../libs/products/datasource/src/entities/ProductSchema';
import { screenshotCleanupIntents } from '../../../libs/products/datasource/src/entities/ScreenshotCleanupIntentSchema';
import { ProductContentSyncQueueService } from '../../../libs/products/service/src/ProductContentSyncQueueService';
import { ScreenshotCleanupQueueService } from '../../../libs/products/service/src/ScreenshotCleanupQueueService';
import { runRecoveryLane } from '../src/functions/recoveryDeadline';

const databaseUrl = process.env['RECOVERY_TEST_DATABASE_URL'];
vi.mock('../src/config', () => ({}));
vi.mock('../src/config/environment', () => ({
  get DATABASE_URL() {
    return process.env['RECOVERY_TEST_DATABASE_URL'];
  },
}));

const suite = databaseUrl ? describe : describe.skip;
suite('isolated PostgreSQL recovery tick deadlines', () => {
  const connection = postgres(databaseUrl ?? 'postgres://localhost/unused', {
    prepare: false,
  });
  const db = drizzle(connection);
  const researchQueue = new ProductResearchQueueService();
  const descriptionQueue = new ProductDescriptionQueueService();
  const translationQueue = new TranslationQueueService();
  const contentQueue = new ProductContentSyncQueueService();
  const cleanupQueue = new ScreenshotCleanupQueueService();
  let tick: Handler;
  const context = { getRemainingTimeInMillis: () => 5_000 } as never;

  beforeAll(async () => {
    const target = new URL(databaseUrl!);
    if (!['localhost', '127.0.0.1'].includes(target.hostname) || target.pathname !== '/darun_recovery')
      throw new Error('Only the isolated local darun_recovery database is allowed');
    await migrate(db, {
      migrationsFolder: resolve(process.cwd(), 'scripts/migrations'),
    });
    Container.set(DrizzleToken, db);
    Container.set(ProductResearchQueueService, researchQueue);
    Container.set(ProductDescriptionQueueService, descriptionQueue);
    Container.set(TranslationQueueService, translationQueue);
    Container.set(ProductContentSyncQueueService, contentQueue);
    Container.set(ScreenshotCleanupQueueService, cleanupQueue);
    Container.set(SearchableProductRepositoryToken, {} as never);
    Container.set(ImageDeleterToken, {} as never);
    tick = (await import('../src/functions/job-recovery-tick')).handler;
  }, 30_000);
  beforeEach(async () => {
    // This integration owns only PostgreSQL; real SDK transport is exercised by its loopback suite.
    vi.spyOn(researchQueue, 'sendJob').mockResolvedValue(false);
    vi.spyOn(descriptionQueue, 'sendJob').mockResolvedValue(false);
    vi.spyOn(translationQueue, 'sendJob').mockResolvedValue(false);
    vi.spyOn(contentQueue, 'sendIntent').mockResolvedValue(false);
    vi.spyOn(cleanupQueue, 'sendIntent').mockResolvedValue(false);
    await db.delete(productContentSyncIntents);
    await Promise.all([
      db.delete(screenshotCleanupIntents),
      db.delete(products),
      db.delete(productResearchJobs),
      db.delete(productDescriptionJobs),
      db.delete(translationJobs),
    ]);
  });
  afterEach(() => vi.restoreAllMocks());
  afterAll(async () => {
    await connection.end({ timeout: 1 });
    Container.reset();
  });

  async function seedJobs() {
    await Promise.all([
      db
        .insert(productResearchJobs)
        .values({ id: 'research', requestKey: 'recovery', officialUrl: 'https://example.invalid' }),
      db.insert(productDescriptionJobs).values({ id: 'description', productId: 'product' }),
      db.insert(translationJobs).values({ id: 'translation', entityType: 'Product', entityId: 'product' }),
    ]);
  }

  async function expectNoRecoveryConnections() {
    await expect
      .poll(
        async () => {
          const [row] =
            await connection`select count(*)::int as count from pg_stat_activity where application_name = 'darun-job-recovery'`;
          return row!.count;
        },
        { timeout: 1_000 }
      )
      .toBe(0);
  }

  it('research 전송이 멈춰도 소개와 번역 복구를 먼저 시작한다', async () => {
    await seedJobs();
    let release!: () => void;
    const blocked = new Promise<boolean>(resolve => {
      release = () => resolve(true);
    });
    onTestFinished(release);
    vi.spyOn(researchQueue, 'sendJob').mockReturnValue(blocked);
    let descriptionStarted!: () => void;
    let translationStarted!: () => void;
    const independentStarts = Promise.all([
      new Promise<void>(resolve => {
        descriptionStarted = resolve;
      }),
      new Promise<void>(resolve => {
        translationStarted = resolve;
      }),
    ]);
    const description = vi.spyOn(descriptionQueue, 'sendJob').mockImplementation(async () => {
      descriptionStarted();
      return true;
    });
    const translation = vi.spyOn(translationQueue, 'sendJob').mockImplementation(async () => {
      translationStarted();
      return true;
    });
    const execution = tick({}, context, () => {});
    try {
      await independentStarts;
      expect(description).toHaveBeenCalledOnce();
      expect(translation).toHaveBeenCalledOnce();
    } finally {
      release();
      await execution;
    }
    await expectNoRecoveryConnections();
  });

  it('응답 없는 전송을 중단하고 미전송 작업의 pending 상태와 예약을 유지한다', async () => {
    await seedJobs();
    let aborted = false;
    const research = vi.spyOn(researchQueue, 'sendJob').mockImplementation(
      (_payload, signal) =>
        new Promise((_resolve, reject) => {
          signal!.addEventListener(
            'abort',
            () => {
              aborted = true;
              reject(signal!.reason);
            },
            { once: true }
          );
        })
    );
    vi.spyOn(descriptionQueue, 'sendJob').mockResolvedValue(true);
    vi.spyOn(translationQueue, 'sendJob').mockResolvedValue(true);
    const result = await tick({}, context, () => {});
    expect(aborted).toBe(true);
    expect(result).toMatchObject({
      queued: 2,
      queues: {
        research: { attempted: 1, queued: 0, timedOut: 1 },
        description: { queued: 1 },
        translation: { queued: 1 },
      },
    });
    const [pending] = await db.select().from(productResearchJobs);
    expect(pending).toMatchObject({
      status: 'pending',
      attemptCount: 0,
      leaseToken: null,
    });
    expect(pending!.nextDispatchAt.getTime()).toBeGreaterThan(Date.now());
    await expectNoRecoveryConnections();
    expect(research).toHaveBeenCalledOnce();
  });

  it('pending 작업의 전송 예약이 남아 있으면 다음 tick도 전송하지 않는다', async () => {
    await seedJobs();
    await db.update(productResearchJobs).set({ nextDispatchAt: new Date(Date.now() + 60_000) });
    const research = vi.spyOn(researchQueue, 'sendJob').mockResolvedValue(true);
    expect(await tick({}, context, () => {})).toMatchObject({ queued: 0 });
    expect(research).not.toHaveBeenCalled();
  });

  it('pending 작업의 전송 예약이 만료된 다음 tick은 같은 ID를 다시 전송한다', async () => {
    await seedJobs();
    await db.update(productResearchJobs).set({ nextDispatchAt: new Date(0) });
    const research = vi.spyOn(researchQueue, 'sendJob').mockResolvedValue(true);
    expect(await tick({}, context, () => {})).toMatchObject({ queued: 1 });
    expect(research).toHaveBeenCalledOnce();
    expect((await db.select().from(productResearchJobs))[0]).toMatchObject({
      id: 'research',
      status: 'pending',
      attemptCount: 0,
    });
  });

  it('research 테이블 잠금 대기와 쿼리를 끝내고 다른 종류의 복구를 유지한다', async () => {
    await seedJobs();
    vi.spyOn(descriptionQueue, 'sendJob').mockResolvedValue(true);
    vi.spyOn(translationQueue, 'sendJob').mockResolvedValue(true);
    const research = vi.spyOn(researchQueue, 'sendJob').mockResolvedValue(true);
    const lock = await connection.reserve();
    await lock`begin`;
    await lock`lock table product_research_jobs in access exclusive mode`;
    try {
      // The lock stays held while healthy siblings finish; the DB's 1s statement timeout
      // must end research without depending on their connection setup fitting into 500ms.
      const result = await tick({}, { getRemainingTimeInMillis: () => 12_000 } as never, () => {});
      expect(descriptionQueue.sendJob).toHaveBeenCalledOnce();
      expect(translationQueue.sendJob).toHaveBeenCalledOnce();
      expect(result).toMatchObject({
        queued: 2,
        queues: { research: { attempted: 0, queued: 0, timedOut: 1 } },
      });
      expect(research).not.toHaveBeenCalled();
      await expectNoRecoveryConnections();
    } finally {
      await lock`rollback`;
      lock.release();
    }
    expect((await db.select().from(productResearchJobs))[0]).toMatchObject({
      nextDispatchAt: expect.any(Date),
      status: 'pending',
      attemptCount: 0,
    });
    expect(await tick({}, context, () => {})).toMatchObject({ queued: 1 });
  });

  it('기한 도중의 예약 transaction을 rollback하고 늦은 완료 쓰기를 실행하지 않는다', async () => {
    await seedJobs();
    let reserved = false;
    const result = await runRecoveryLane(Date.now() + 3_000, async scope => {
      await scope.db.transaction(async tx => {
        await tx.update(productResearchJobs).set({ nextDispatchAt: new Date(Date.now() + 60_000) });
        reserved = true;
        await tx.execute(sql`select pg_sleep(10)`);
        await tx.update(productResearchJobs).set({ status: 'completed' });
      });
      return { recovered: 1, queued: 1 };
    });
    expect(reserved).toBe(true);
    expect(result).toMatchObject({ queued: 0, timedOut: 1 });
    await expectNoRecoveryConnections();
    const [pending] = await db.select().from(productResearchJobs);
    expect(pending).toMatchObject({ status: 'pending', attemptCount: 0 });
    expect(pending!.nextDispatchAt.getTime()).toBeLessThan(Date.now());
  });

  it('중첩 tick은 같은 예약을 중복 전송하지 않고 기존 조회 상한을 지킨다', async () => {
    await db.insert(productResearchJobs).values(
      Array.from({ length: 30 }, (_, index) => ({
        id: `research-${index}`,
        requestKey: `request-${index}`,
        officialUrl: 'https://example.invalid',
      }))
    );
    const sends = vi.spyOn(researchQueue, 'sendJob').mockResolvedValue(true);
    const results = await Promise.all([tick({}, context, () => {}), tick({}, context, () => {})]);
    expect(results.map(result => result.queues.research.recovered).sort((a, b) => a - b)).toEqual([5, 25]);
    expect(sends).toHaveBeenCalledTimes(30);
    expect(new Set(sends.mock.calls.map(([payload]) => payload.jobId)).size).toBe(30);
    expect(await db.select().from(productResearchJobs).where(eq(productResearchJobs.status, 'completed'))).toHaveLength(
      0
    );
    await expectNoRecoveryConnections();
  });

  it('TLS로 실행 중인 DB 쿼리와 소켓도 기한에 함께 종료한다', async () => {
    const directory = mkdtempSync(join(tmpdir(), 'darun-recovery-tls-'));
    const keyFile = join(directory, 'key.pem');
    const certFile = join(directory, 'cert.pem');
    execFileSync(
      'openssl',
      [
        'req',
        '-x509',
        '-newkey',
        'rsa:2048',
        '-nodes',
        '-days',
        '1',
        '-subj',
        '/CN=localhost',
        '-keyout',
        keyFile,
        '-out',
        certFile,
      ],
      { stdio: 'ignore' }
    );
    const secureContext = createSecureContext({
      key: readFileSync(keyFile),
      cert: readFileSync(certFile),
    });
    const sockets = new Set<Socket>();
    const track = (socket: Socket) => {
      sockets.add(socket);
      socket.on('error', () => {});
      socket.once('close', () => sockets.delete(socket));
      return socket;
    };
    const target = new URL(databaseUrl!);
    let encrypted = false;
    const server = createServer(raw => {
      track(raw);
      raw.once('data', data => {
        // PostgreSQL's SSLRequest must precede TLS; plaintext startup is never forwarded.
        if (data.length !== 8 || data.readInt32BE(4) !== 80877103) {
          raw.destroy();
          return;
        }
        raw.write('S');
        const tls = track(new TLSSocket(raw, { isServer: true, secureContext }));
        const upstream = track(connect({ host: target.hostname, port: Number(target.port) }));
        tls.on('secure', () => {
          encrypted = true;
        });
        tls.pipe(upstream);
        upstream.pipe(tls);
        tls.once('close', () => upstream.destroy());
        upstream.once('close', () => tls.destroy());
      });
    });
    await new Promise<void>(resolve => server.listen(0, '127.0.0.1', resolve));
    const address = server.address();
    if (!address || typeof address === 'string') throw new Error('Missing TLS fixture address');
    const proxied = new URL(databaseUrl!);
    proxied.hostname = '127.0.0.1';
    proxied.port = String(address.port);
    proxied.searchParams.set('sslmode', 'require');
    // The environment mock exposes a getter so this scope connects through the TLS fixture.
    vi.stubEnv('RECOVERY_TEST_DATABASE_URL', proxied.toString());
    try {
      let started = false;
      const result = await runRecoveryLane(Date.now() + 3_000, async scope => {
        await scope.db.execute(sql`select 1`);
        started = true;
        await scope.db.execute(sql`select pg_sleep(10)`);
        throw new Error('The sleeping query must never finish');
      });
      expect(encrypted).toBe(true);
      expect(started).toBe(true);
      expect(result).toMatchObject({ queued: 0, timedOut: 1 });
      await expect.poll(() => sockets.size, { timeout: 1_000 }).toBe(0);
      await expectNoRecoveryConnections();
      // Preserve the driver's certificate policy: verify-full rejects the untrusted fixture.
      proxied.searchParams.set('sslmode', 'verify-full');
      vi.stubEnv('RECOVERY_TEST_DATABASE_URL', proxied.toString());
      let queried = false;
      const rejected = await runRecoveryLane(Date.now() + 3_000, async scope => {
        await scope.db.execute(sql`select 1`);
        queried = true;
        return { recovered: 0, queued: 0 };
      });
      expect(queried).toBe(false);
      expect(rejected.failed).toBe(1);
    } finally {
      vi.unstubAllEnvs();
      for (const socket of sockets) socket.destroy();
      await new Promise<void>((resolve, reject) => server.close(error => (error ? reject(error) : resolve())));
      rmSync(directory, { recursive: true, force: true });
    }
  });

  it('정리 시간만 남으면 DB 연결과 큐 전송을 시작하지 않는다', async () => {
    await seedJobs();
    const send = vi.spyOn(researchQueue, 'sendJob').mockResolvedValue(true);
    expect(await tick({}, { getRemainingTimeInMillis: () => 1_000 } as never, () => {})).toMatchObject({
      recovered: 0,
      queued: 0,
    });
    expect(send).not.toHaveBeenCalled();
    await expectNoRecoveryConnections();
  });

  it('가짜 시계에서 개별 전송의 2초 기한 뒤 다음 전송을 계속한다', async () => {
    vi.useFakeTimers();
    let aborted = false;
    try {
      const execution = runRecoveryLane(Date.now() + 5_000, async scope => {
        try {
          await scope.send(
            signal =>
              new Promise((_resolve, reject) => {
                signal.addEventListener(
                  'abort',
                  () => {
                    aborted = true;
                    reject(signal.reason);
                  },
                  { once: true }
                );
              })
          );
        } catch {
          /* the next recoverable job still gets a chance */
        }
        await scope.send(async () => true);
        return { recovered: 2, queued: 1 };
      });
      await vi.advanceTimersByTimeAsync(2_001);
      expect(await execution).toMatchObject({ recovered: 2, attempted: 2, queued: 1, timedOut: 1 });
      expect(aborted).toBe(true);
    } finally {
      vi.useRealTimers();
    }
  });

  it('DB 초기 응답이 없어도 연결을 중단하고 소켓 종료를 기다린다', async () => {
    const sockets = new Set<Socket>();
    const server = createServer(socket => {
      sockets.add(socket);
      socket.resume();
      socket.once('close', () => sockets.delete(socket));
    });
    await new Promise<void>(resolve => server.listen(0, '127.0.0.1', resolve));
    const address = server.address();
    if (!address || typeof address === 'string') throw new Error('Missing stalled PostgreSQL fixture');
    const target = new URL(databaseUrl!);
    target.port = String(address.port);
    vi.stubEnv('RECOVERY_TEST_DATABASE_URL', target.toString());
    try {
      const result = await runRecoveryLane(Date.now() + 200, async scope => {
        await scope.db.execute(sql`select 1`);
        return { recovered: 1, queued: 0 };
      });
      expect(result).toMatchObject({ recovered: 0, queued: 0, timedOut: 1 });
      await expect.poll(() => sockets.size, { timeout: 1_000 }).toBe(0);
    } finally {
      vi.unstubAllEnvs();
      for (const socket of sockets) socket.destroy();
      await new Promise<void>((resolve, reject) => server.close(error => (error ? reject(error) : resolve())));
    }
  });

  it('전체 기한 전에도 DB statement timeout으로 느린 조회를 취소한다', async () => {
    const result = await runRecoveryLane(Date.now() + 3_000, async scope => {
      await scope.db.execute(sql`select pg_sleep(10)`);
      return { recovered: 1, queued: 1 };
    });
    expect(result).toMatchObject({ recovered: 0, queued: 0, timedOut: 1, failed: 0 });
    await expectNoRecoveryConnections();
  });

  async function seedContentAndCleanup() {
    await db.insert(products).values({
      id: 'recovery-product',
      name: 'Recovery',
      slug: 'recovery',
      summary: 'fixture',
      logoUrl: 'https://example.invalid/logo',
    });
    await Promise.all([
      db
        .insert(productContentSyncIntents)
        .values({ id: 'sync', productId: 'recovery-product', sourceRevision: 0n, kind: 'search' }),
      db
        .insert(screenshotCleanupIntents)
        .values({ id: 'cleanup', screenshotId: 'deleted', imageUrl: 'https://example.invalid/image' }),
    ]);
  }

  describe('검색 동기화와 이미지 정리의 복구 예약', () => {
    beforeEach(seedContentAndCleanup);

    it('검색 동기화와 이미지 정리도 중단 시 완료하지 않고 예약을 유지한다', async () => {
      await Promise.all([
        db.insert(productDescriptionJobs).values({ id: 'description', productId: 'product' }),
        db.insert(translationJobs).values({ id: 'translation', entityType: 'Product', entityId: 'product' }),
      ]);
      vi.spyOn(descriptionQueue, 'sendJob').mockResolvedValue(true);
      vi.spyOn(translationQueue, 'sendJob').mockResolvedValue(true);
      const blocked = (_id: string, signal?: AbortSignal) =>
        new Promise<boolean>((_resolve, reject) => {
          signal!.addEventListener('abort', () => reject(signal!.reason), { once: true });
        });
      const syncSend = vi.spyOn(contentQueue, 'sendIntent').mockImplementation(blocked);
      const cleanupSend = vi.spyOn(cleanupQueue, 'sendIntent').mockImplementation(blocked);
      expect(await tick({}, context, () => {})).toMatchObject({
        queued: 2,
        queues: {
          contentSync: { attempted: 1, queued: 0, timedOut: 1 },
          screenshotCleanup: { attempted: 1, queued: 0, timedOut: 1 },
        },
      });
      for (const row of [
        ...(await db.select().from(productContentSyncIntents)),
        ...(await db.select().from(screenshotCleanupIntents)),
      ]) {
        expect(row).toMatchObject({ status: 'pending', attemptCount: 0, leaseToken: null });
        expect(row.dispatchAfter.getTime()).toBeGreaterThan(Date.now());
      }
      await expectNoRecoveryConnections();
      expect(syncSend).toHaveBeenCalledOnce();
      expect(cleanupSend).toHaveBeenCalledOnce();
    });

    it('검색 동기화와 정리는 미완료 예약이 만료된 뒤 같은 의도를 다시 전송한다', async () => {
      await Promise.all([
        db.update(productContentSyncIntents).set({ dispatchAfter: new Date(Date.now() + 60_000) }),
        db.update(screenshotCleanupIntents).set({ dispatchAfter: new Date(Date.now() + 60_000) }),
      ]);
      const syncSend = vi.spyOn(contentQueue, 'sendIntent').mockResolvedValue(true);
      const cleanupSend = vi.spyOn(cleanupQueue, 'sendIntent').mockResolvedValue(true);
      expect(await tick({}, context, () => {})).toMatchObject({ queued: 0 });
      expect(syncSend).not.toHaveBeenCalled();
      expect(cleanupSend).not.toHaveBeenCalled();
      await db.update(productContentSyncIntents).set({ dispatchAfter: new Date(0) });
      await db.update(screenshotCleanupIntents).set({ dispatchAfter: new Date(0) });
      expect(await tick({}, context, () => {})).toMatchObject({ queued: 2 });
      expect(syncSend).toHaveBeenCalledOnce();
      expect(cleanupSend).toHaveBeenCalledOnce();
      expect((await db.select().from(productContentSyncIntents))[0]!.status).toBe('pending');
      expect((await db.select().from(screenshotCleanupIntents))[0]!.status).toBe('pending');
    });
  });
});

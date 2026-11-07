import 'reflect-metadata';
import { ProductDescriptionQueueService, ProductResearchQueueService } from '@darun/products-service';
import { TranslationQueueService } from '@darun/translation-service';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { createServer } from 'node:http';
import type { Socket } from 'node:net';
import { ProductContentSyncQueueService } from '../../../libs/products/service/src/ProductContentSyncQueueService';
import { ScreenshotCleanupQueueService } from '../../../libs/products/service/src/ScreenshotCleanupQueueService';

const senders = {
  research: (signal: AbortSignal) => new ProductResearchQueueService().sendJob({ jobId: 'research' }, signal),
  description: (signal: AbortSignal) =>
    new ProductDescriptionQueueService().sendJob({ jobId: 'description', productId: 'product' }, signal),
  translation: (signal: AbortSignal) =>
    new TranslationQueueService().sendJob({ jobId: 'translation', entityType: 'Product', entityId: 'product' }, signal),
  contentSync: (signal: AbortSignal) => new ProductContentSyncQueueService().sendIntent('intent', signal),
  screenshotCleanup: (signal: AbortSignal) => new ScreenshotCleanupQueueService().sendIntent('cleanup', signal),
};

afterEach(() => vi.unstubAllEnvs());
describe('recovery queue cancellation through the real SQS HTTP transport', () => {
  it.each(Object.entries(senders))(
    '%s의 응답 없는 SQS 요청은 AbortSignal로 실제 연결을 닫는다',
    async (_kind, send) => {
      let received!: () => void;
      const requestReceived = new Promise<void>(resolve => {
        received = resolve;
      });
      const sockets = new Set<Socket>();
      const server = createServer(request => {
        request.resume();
        request.once('end', received);
        // Deliberately keep the SQS response open until cancellation.
      });
      server.on('connection', socket => {
        sockets.add(socket);
        socket.once('close', () => sockets.delete(socket));
      });
      await new Promise<void>(resolve => server.listen(0, '127.0.0.1', resolve));
      const address = server.address();
      if (!address || typeof address === 'string') throw new Error('Missing SQS fixture address');
      const queueUrl = `http://127.0.0.1:${address.port}/123456789012/recovery`;
      for (const name of [
        'PRODUCT_RESEARCH_QUEUE_URL',
        'PRODUCT_DESCRIPTION_QUEUE_URL',
        'TRANSLATION_QUEUE_URL',
        'PRODUCT_CONTENT_SYNC_QUEUE_URL',
        'SCREENSHOT_CLEANUP_QUEUE_URL',
      ])
        vi.stubEnv(name, queueUrl);
      vi.stubEnv('AWS_ACCESS_KEY_ID', 'recovery-fixture');
      vi.stubEnv('AWS_SECRET_ACCESS_KEY', 'recovery-fixture-secret');
      vi.stubEnv('AWS_PROFILE', undefined);
      vi.stubEnv('AWS_DEFAULT_PROFILE', undefined);
      vi.stubEnv('AWS_SESSION_TOKEN', undefined);
      vi.stubEnv('AWS_CONFIG_FILE', '/dev/null');
      vi.stubEnv('AWS_SHARED_CREDENTIALS_FILE', '/dev/null');
      vi.stubEnv('AWS_EC2_METADATA_DISABLED', 'true');
      vi.stubEnv('AWS_REGION', 'ap-northeast-2');
      const controller = new AbortController();
      const fallback = setTimeout(() => controller.abort(), 2_000);
      const result = send(controller.signal).then(
        () => 'sent',
        error => error.name
      );
      try {
        await Promise.race([
          requestReceived,
          result.then(() => {
            throw new Error('SQS never reached the loopback fixture');
          }),
        ]);
        controller.abort();
        expect(await result).toBe('AbortError');
        await expect.poll(() => sockets.size, { timeout: 1_000 }).toBe(0);
      } finally {
        clearTimeout(fallback);
        controller.abort();
        for (const socket of sockets) socket.destroy();
        await new Promise<void>((resolve, reject) => server.close(error => (error ? reject(error) : resolve())));
      }
    }
  );
});

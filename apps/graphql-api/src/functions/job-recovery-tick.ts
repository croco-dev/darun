import 'reflect-metadata';
import '../config';
import { ImageDeleterToken, type ImageDeleter } from '@darun/images-domain';
import {
  PostgresqlProductDescriptionJobRepository,
  PostgresqlProductResearchJobRepository,
} from '@darun/products-datasource';
import { ProductDescriptionQueueService, ProductResearchQueueService } from '@darun/products-service';
import { SearchableProductRepositoryToken, type SearchableProductRepository } from '@darun/search-domain';
import { PostgresqlTranslationJobRepository } from '@darun/translation-datasource';
import { TranslationQueueService } from '@darun/translation-service';
import type { Handler } from 'aws-lambda';
import { Container } from 'typedi';
import { ProductContentSyncQueueService } from '../../../../libs/products/service/src/ProductContentSyncQueueService';
import { ScreenshotCleanupQueueService } from '../../../../libs/products/service/src/ScreenshotCleanupQueueService';
import { PostgresqlProductContentSync } from '../adapters/PostgresqlProductContentSync';
import { PostgresqlScreenshotCleanup } from '../adapters/PostgresqlScreenshotCleanup';
import { runRecoveryLane, type RecoveryScope } from './recoveryDeadline';

const RECOVERY_LIMIT = 25;
const CLEANUP_MARGIN_MS = 2_000;
const QUEUE_BUDGET_MS = 10_000;

async function resendJobs<T>(
  scope: RecoveryScope,
  find: () => Promise<T[]>,
  send: (job: T, signal: AbortSignal) => Promise<boolean>
) {
  scope.signal.throwIfAborted();
  const jobs = await find();
  let queued = 0;
  for (const job of jobs) {
    scope.signal.throwIfAborted();
    try {
      if (await scope.send(signal => send(job, signal))) queued++;
    } catch {
      // Committed dispatch reservations expire under the existing next-tick rules.
    }
  }
  return { recovered: jobs.length, queued };
}

/** All five queue kinds get an independent, bounded recovery opportunity. */
export const handler: Handler = async (_event, context) => {
  const deadline =
    Date.now() + Math.max(0, Math.min(QUEUE_BUDGET_MS, context.getRemainingTimeInMillis() - CLEANUP_MARGIN_MS));
  const now = new Date();
  const lanes = {
    contentSync: (scope: RecoveryScope) => {
      const queue = Container.get(ProductContentSyncQueueService);
      const sync = new PostgresqlProductContentSync(
        scope.db,
        Container.get<SearchableProductRepository>(SearchableProductRepositoryToken),
        queue
      );
      return sync.dispatch(RECOVERY_LIMIT, id => scope.send(signal => queue.sendIntent(id, signal)));
    },
    research: (scope: RecoveryScope) => {
      const repository = new PostgresqlProductResearchJobRepository(scope.db);
      const queue = Container.get(ProductResearchQueueService);
      return resendJobs(
        scope,
        () => repository.findRecoverableJobs({ now, limit: RECOVERY_LIMIT }),
        (job, signal) => queue.sendJob({ jobId: job.id }, signal)
      );
    },
    description: (scope: RecoveryScope) => {
      const repository = new PostgresqlProductDescriptionJobRepository(scope.db);
      const queue = Container.get(ProductDescriptionQueueService);
      return resendJobs(
        scope,
        () => repository.findRecoverableJobs({ now, limit: RECOVERY_LIMIT }),
        (job, signal) => queue.sendJob({ jobId: job.id, productId: job.productId }, signal)
      );
    },
    translation: (scope: RecoveryScope) => {
      const repository = new PostgresqlTranslationJobRepository(scope.db);
      const queue = Container.get(TranslationQueueService);
      return resendJobs(
        scope,
        () => repository.findRecoverableJobs({ now, limit: RECOVERY_LIMIT }),
        (job, signal) => {
          const entityType = job.entityType;
          if (entityType !== 'Product' && entityType !== 'Magazine' && entityType !== 'ProductFeature')
            throw new Error('Unsupported translation entity');
          return queue.sendJob({ jobId: job.id, entityType, entityId: job.entityId }, signal);
        }
      );
    },
    screenshotCleanup: (scope: RecoveryScope) => {
      const queue = Container.get(ScreenshotCleanupQueueService);
      const cleanup = new PostgresqlScreenshotCleanup(scope.db, Container.get<ImageDeleter>(ImageDeleterToken), queue);
      return cleanup.dispatch(RECOVERY_LIMIT, id => scope.send(signal => queue.sendIntent(id, signal)));
    },
  };
  // One task/connection per kind; no job fan-out or shared pool can let one kind starve another.
  const queues = Object.fromEntries(
    await Promise.all(
      Object.entries(lanes).map(async ([kind, run]) => {
        const result = await runRecoveryLane(deadline, run);
        console.log('[JobRecoveryTick]', { kind, ...result });
        return [kind, result] as const;
      })
    )
  );
  return {
    recovered: Object.values(queues).reduce((sum, counts) => sum + counts.recovered, 0),
    queued: Object.values(queues).reduce((sum, counts) => sum + counts.queued, 0),
    queues,
  };
};

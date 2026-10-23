import 'reflect-metadata';
import '../config';
import { ProductResearchJobRepositoryToken, type ProductResearchJobRepository } from '@darun/products-domain';
import { ProductDescriptionJobService, ProductResearchQueueService } from '@darun/products-service';
import { TranslationJobService } from '@darun/translation-service';
import type { Handler } from 'aws-lambda';
import { Container } from 'typedi';
import { PostgresqlProductContentSync } from '../adapters/PostgresqlProductContentSync';
import { createPostgresConnection } from '../config/database';

const RECOVERY_LIMIT = 25;

/**
 * 주기 recovery tick: DB에 남아 있는 전송 누락 pending과 만료 lease
 * in_progress를 재발견해 각 큐로 다시 전송한다. 전송 실패는 pending으로
 * 남겨 다음 tick이 다시 시도한다. 수동 개입 없이 복구를 완료한다.
 */
export const handler: Handler = async (): Promise<{ recovered: number; queued: number }> => {
  await createPostgresConnection();

  const researchRepository = Container.get<ProductResearchJobRepository>(ProductResearchJobRepositoryToken);
  const researchQueue = Container.get(ProductResearchQueueService);
  const descriptionService = Container.get(ProductDescriptionJobService);
  const translationService = Container.get(TranslationJobService);

  const now = new Date();
  let recovered = 0;
  let queued = 0;
  const sync = await Container.get(PostgresqlProductContentSync).dispatch(RECOVERY_LIMIT);
  recovered += sync.recovered;
  queued += sync.queued;

  const researchJobs = await researchRepository.findRecoverableJobs({ now, limit: RECOVERY_LIMIT });
  for (const job of researchJobs) {
    recovered += 1;
    try {
      const sent = await researchQueue.sendJob({ jobId: job.id });
      if (sent) {
        queued += 1;
      }
    } catch (error) {
      console.warn(`[JobRecoveryTick] Research job ${job.id} resend failed; leaving pending:`, error);
    }
  }

  const description = await descriptionService.recoverInterruptedJobs({ now, limit: RECOVERY_LIMIT });
  recovered += description.recovered;
  queued += description.queued;

  const translation = await translationService.recoverInterruptedJobs({ now, limit: RECOVERY_LIMIT });
  recovered += translation.recovered;
  queued += translation.queued;

  console.log(`[JobRecoveryTick] Recovered ${recovered} jobs, queued ${queued}.`);
  return { recovered, queued };
};

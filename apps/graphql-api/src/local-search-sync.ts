import 'reflect-metadata';
import type { ProductContentSyncStatus } from '@darun/products-domain';
import { MongodbSearchableProductRepository } from '@darun/search-datasource';
import { drizzle } from 'drizzle-orm/postgres-js';
import mongoose from 'mongoose';
import postgres from 'postgres';
import { setTimeout } from 'node:timers/promises';
import { parseArgs } from 'node:util';
import { ProductContentSyncQueueService } from '../../../libs/products/service/src/ProductContentSyncQueueService';
import { PostgresqlProductContentSync } from './adapters/PostgresqlProductContentSync';

export function localSearchOptions(args: string[], env: NodeJS.ProcessEnv) {
  const { values } = parseArgs({
    args,
    options: { watch: { type: 'boolean', default: false }, limit: { type: 'string', default: '50' } },
    allowPositionals: false,
  });
  if (env['INFRA_ENV'] !== 'local') throw new Error('INFRA_ENV=local이 필요합니다.');
  if (!/^(?:[1-9]|[1-9][0-9]|100)$/.test(values.limit)) throw new Error('--limit은 1~100이어야 합니다.');
  function target(value: string | undefined, protocols: string[]) {
    let url: URL;
    try {
      url = new URL(value ?? '');
    } catch {
      throw new Error('DATABASE_URL과 MONGODB_URI를 명시해야 합니다.');
    }
    if (
      !protocols.includes(url.protocol) ||
      !['127.0.0.1', '[::1]'].includes(url.hostname) ||
      url.pathname !== '/darun' ||
      url.search ||
      url.hash ||
      (value?.split('@').length ?? 0) > 2
    )
      throw new Error('127.0.0.1/[::1]의 darun DB만 허용합니다. query/fragment는 사용할 수 없습니다.');
    return url.toString();
  }
  return {
    watch: values.watch,
    limit: Number(values.limit),
    databaseUrl: target(env['DATABASE_URL'], ['postgres:', 'postgresql:']),
    mongodbUri: target(env['MONGODB_URI'], ['mongodb:']),
  };
}

export async function main() {
  // Validate both targets before creating either connection. Do not load app config,
  // Firebase, AWS credentials, translation workers or local environment files.
  const options = localSearchOptions(process.argv.slice(2), process.env);
  const stop = new AbortController();
  const onSignal = () => stop.abort();
  process.on('SIGINT', onSignal);
  process.on('SIGTERM', onSignal);
  const connection = postgres(options.databaseUrl, {
    prepare: false,
    max: 2,
    connect_timeout: 5,
    connection: { statement_timeout: 10_000 },
  });
  try {
    await mongoose.connect(options.mongodbUri, {
      directConnection: true,
      serverSelectionTimeoutMS: 5_000,
      socketTimeoutMS: 10_000,
    });
    const search = new MongodbSearchableProductRepository(() => undefined);
    const sync = new PostgresqlProductContentSync(drizzle(connection), search, new ProductContentSyncQueueService());
    do {
      const intentIds: string[] = [];
      const intents: ProductContentSyncStatus[] = [];
      await sync.dispatchSearch(options.limit, async intentId => {
        intentIds.push(intentId);
        return true;
      });
      for (const intentId of intentIds) {
        if (stop.signal.aborted) break;
        await sync.executeSearch(intentId);
        const result = await sync.status(intentId);
        if (!result) throw new Error('CONTENT_SYNC_INTENT_NOT_FOUND');
        intents.push(result);
      }
      console.log(
        JSON.stringify({
          processed: intents.length,
          intents: intents.map(({ intentId, productId, sourceRevision, status, attemptCount }) => ({
            intentId,
            productId,
            sourceRevision,
            status,
            attemptCount,
          })),
        })
      );
      if (!options.watch && intents.some(intent => intent.status === 'failed')) process.exitCode = 1;
      if (!options.watch || stop.signal.aborted) break;
      await setTimeout(5_000, undefined, { signal: stop.signal }).catch(error => {
        if (!stop.signal.aborted) throw error;
      });
    } while (!stop.signal.aborted);
  } finally {
    process.removeListener('SIGINT', onSignal);
    process.removeListener('SIGTERM', onSignal);
    await Promise.all([mongoose.disconnect(), connection.end({ timeout: 5 })]);
  }
}

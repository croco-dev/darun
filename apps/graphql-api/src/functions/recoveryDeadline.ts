import type { Drizzle } from '@darun/provider-database';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { createConnection, type Socket } from 'node:net';
import { DATABASE_URL } from '../config/environment';

const QUERY_TIMEOUT_MS = 1_000;
const SEND_TIMEOUT_MS = 2_000;

export interface RecoveryCounts {
  recovered: number;
  attempted: number;
  queued: number;
  timedOut: number;
  failed: number;
}

export interface RecoveryScope {
  db: Drizzle;
  signal: AbortSignal;
  send(deliver: (signal: AbortSignal) => Promise<boolean>): Promise<boolean>;
}

/** One queue kind owns its connections, so aborting it cannot close a sibling's DB work. */
export async function runRecoveryLane(
  deadline: number,
  run: (scope: RecoveryScope) => Promise<{ recovered: number; queued: number }>
): Promise<RecoveryCounts> {
  const counts: RecoveryCounts = {
    recovered: 0,
    attempted: 0,
    queued: 0,
    timedOut: 0,
    failed: 0,
  };
  if (Date.now() >= deadline) return counts;
  const controller = new AbortController();
  const { signal } = controller;
  const sockets = new Set<Socket>();
  let nextHost = 0;
  // postgres-js documents `socket`, but 3.4.8 omits it from Options' TypeScript declaration.
  const options = {
    prepare: false,
    max: 1,
    connect_timeout: 1,
    connection: {
      application_name: 'darun-job-recovery',
      statement_timeout: Math.min(QUERY_TIMEOUT_MS, Math.max(1, deadline - Date.now())),
      idle_in_transaction_session_timeout: QUERY_TIMEOUT_MS,
    },
    socket: ({ host, port, path }: { host: string[]; port: number[]; path?: string }) =>
      new Promise<Socket>((resolve, reject) => {
        signal.throwIfAborted();
        const index = nextHost++ % host.length;
        const socket = path
          ? createConnection(path)
          : createConnection({
              host: host[index]!,
              port: port[index] ?? port[0]!,
            });
        // The driver uses this property for TLS SNI when wrapping a custom socket.
        Object.assign(socket, { host: host[index] });
        sockets.add(socket);
        const abort = () => {
          reject(signal.reason);
        };
        signal.addEventListener('abort', abort, { once: true });
        socket.once('error', reject);
        socket.once('connect', () => {
          if (signal.aborted) abort();
          else resolve(socket);
        });
      }),
  };
  const client = postgres(DATABASE_URL, options);
  let closing: Promise<void> | undefined;
  const stop = () => {
    if (closing) return closing;
    controller.abort(new DOMException('Recovery deadline exceeded', 'TimeoutError'));
    // Terminate driver query/transaction admission before destroying the underlying sockets.
    // Otherwise a rejected transaction can enqueue rollback on a socket already set to null.
    closing = client.end({ timeout: 0 }).then(() => {
      for (const socket of sockets) socket.destroy();
    });
    return closing;
  };
  const timer = setTimeout(stop, Math.max(0, deadline - Date.now()));
  try {
    const result = await run({
      db: drizzle(client),
      signal,
      async send(deliver) {
        signal.throwIfAborted();
        counts.attempted++;
        const sendController = new AbortController();
        const sendTimer = setTimeout(
          () => sendController.abort(new DOMException('Recovery SQS send timed out', 'TimeoutError')),
          Math.min(SEND_TIMEOUT_MS, Math.max(1, deadline - Date.now()))
        );
        const sendSignal = AbortSignal.any([signal, sendController.signal]);
        try {
          const sent = await deliver(sendSignal);
          sendSignal.throwIfAborted();
          if (sent) counts.queued++;
          return sent;
        } catch (error) {
          if (sendSignal.aborted) counts.timedOut++;
          else counts.failed++;
          throw error;
        } finally {
          clearTimeout(sendTimer);
        }
      },
    });
    counts.recovered = result.recovered;
  } catch (error) {
    const cause = error instanceof Error && 'cause' in error && error.cause ? error.cause : error;
    const databaseTimeout =
      cause instanceof Error && 'code' in cause && (cause.code === '57014' || cause.code === 'CONNECT_TIMEOUT');
    if (signal.aborted || databaseTimeout) {
      if (!counts.timedOut) counts.timedOut++;
    } else counts.failed++;
  } finally {
    clearTimeout(timer);
    await stop();
    // TLS wrapping removes the raw socket's original listeners; attach close observers at teardown.
    await Promise.all(
      [...sockets].map(
        socket =>
          new Promise<void>(resolve => {
            if (socket.closed) resolve();
            else {
              socket.once('close', resolve);
              socket.destroy();
            }
          })
      )
    );
  }
  counts.recovered = Math.max(counts.recovered, counts.attempted);
  return counts;
}

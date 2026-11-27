import { createDomainError } from '@darun/utils-error';
import { Cursor } from './Cursor';

type TimestampPosition = { createdAt: string; id: string };
const keys = ['scope', 'createdAt', 'id'] as const;
const timestampPattern = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{6}$/;

export function encodeTimestampCursor(scope: string, position: TimestampPosition): string {
  return Cursor.encode({ scope, ...position }, [...keys]);
}

export function decodeTimestampCursor(scope: string, cursor: string): TimestampPosition {
  const invalid = () => createDomainError('pagination/invalid-cursor', '목록 커서가 올바르지 않습니다.');
  if (cursor.length > 1024 || Buffer.from(cursor, 'base64').toString('base64') !== cursor) throw invalid();

  let decoded: Record<(typeof keys)[number], string>;
  try {
    decoded = Cursor.decode(cursor, keys, { allowLegacy: false });
  } catch (error) {
    if (error instanceof Error && error.message === 'pagination/invalid-cursor') throw invalid();
    throw error;
  }

  const { createdAt, id } = decoded;
  if (decoded.scope !== scope || !id || !timestampPattern.test(createdAt)) throw invalid();
  const date = new Date(`${createdAt}Z`);
  if (!Number.isFinite(date.getTime()) || date.toISOString().slice(0, 23) !== createdAt.slice(0, 23)) throw invalid();
  return { createdAt, id };
}

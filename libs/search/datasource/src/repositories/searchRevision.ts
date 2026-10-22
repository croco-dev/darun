import { mongo } from 'mongoose';

export class SearchRevisionInvalidError extends Error {
  readonly code = 'SEARCH_REVISION_INVALID';
  constructor() {
    super('검색 sourceRevision은 BSON signed64 Long이어야 합니다.');
  }
}

export function searchRevision(value: string | undefined): mongo.Long {
  if (typeof value !== 'string' || !/^(0|[1-9][0-9]*)$/.test(value) || BigInt(value) > BigInt('9223372036854775807'))
    throw new SearchRevisionInvalidError();
  return mongo.Long.fromString(value);
}

export function storedSearchRevision(row: Record<string, unknown>): bigint {
  if (!Object.prototype.hasOwnProperty.call(row, 'sourceRevision')) return BigInt('-1');
  if (!mongo.Long.isLong(row.sourceRevision) || row.sourceRevision.unsigned) throw new SearchRevisionInvalidError();
  return BigInt(row.sourceRevision.toString());
}

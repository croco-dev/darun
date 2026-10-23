import { Token } from 'typedi';

export const MongodbSearchConnectionToken = new Token<() => void | Promise<void>>('MongodbSearchConnection');

export class SearchUnavailableError extends Error {
  readonly code = 'SEARCH_UNAVAILABLE';
  readonly retryable = true;

  constructor() {
    super('검색 저장소에 연결할 수 없습니다.');
    this.name = 'SearchUnavailableError';
  }
}

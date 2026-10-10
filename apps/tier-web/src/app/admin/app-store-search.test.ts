import { describe, expect, test } from 'vitest';
import { parseAppleSearchResponse, parseAppStoreKeyword } from './app-store-search';

describe('parseAppStoreKeyword', () => {
  test('trims valid keywords and rejects invalid input', () => {
    expect(parseAppStoreKeyword('  생산성  ')).toBe('생산성');
    expect(parseAppStoreKeyword('a'.repeat(100))).toBe('a'.repeat(100));
    expect(parseAppStoreKeyword(' ')).toBeNull();
    expect(parseAppStoreKeyword('a'.repeat(101))).toBeNull();
    expect(parseAppStoreKeyword(123)).toBeNull();
  });
});

describe('parseAppleSearchResponse', () => {
  test('validates and maps Apple results', () => {
    expect(
      parseAppleSearchResponse({
        resultCount: 1,
        results: [
          {
            trackId: 123456789,
            trackName: '테스트 앱',
            description: '앱 설명',
            artworkUrl512: 'https://example.com/icon.png',
            bundleId: 'ignored.extra.field',
          },
        ],
      })
    ).toEqual([
      {
        app_store_id: 'id123456789',
        name: '테스트 앱',
        description: '앱 설명',
        icon_url: 'https://example.com/icon.png',
      },
    ]);
  });

  test('accepts an empty result set', () => {
    expect(parseAppleSearchResponse({ resultCount: 0, results: [] })).toEqual([]);
  });

  test('keeps valid results when optional fields are absent', () => {
    expect(
      parseAppleSearchResponse({
        resultCount: 2,
        results: [
          { trackId: 123456789, trackName: '코레일톡' },
          { trackId: 'invalid', trackName: '잘못된 결과' },
        ],
      })
    ).toEqual([
      {
        app_store_id: 'id123456789',
        name: '코레일톡',
        description: '',
        icon_url: '',
      },
    ]);
  });

  test('rejects malformed envelopes', () => {
    expect(parseAppleSearchResponse({ resultCount: 1 })).toBeNull();
    expect(parseAppleSearchResponse(null)).toBeNull();
  });
});

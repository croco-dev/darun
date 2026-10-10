import { describe, expect, test } from 'vitest';
import {
  ADMIN_PAGE_SIZE,
  buildAdminPageHref,
  escapeAdminSearchQuery,
  getAdminPageRange,
  getAdminPaginationMeta,
  normalizeAdminPageState,
} from './admin-page-state';

describe('normalizeAdminPageState', () => {
  test('trims query and defaults invalid page', () => {
    expect(normalizeAdminPageState({ query: '  Slack  ', page: '-2' })).toEqual({
      query: 'Slack',
      page: 1,
      pageSize: ADMIN_PAGE_SIZE,
    });
  });

  test('ignores array search params', () => {
    expect(normalizeAdminPageState({ query: ['foo'], page: ['3'] })).toEqual({
      query: '',
      page: 1,
      pageSize: ADMIN_PAGE_SIZE,
    });
  });
});

describe('buildAdminPageHref', () => {
  test('omits default values', () => {
    expect(buildAdminPageHref({ query: '', page: 1 })).toBe('/admin');
    expect(buildAdminPageHref({ query: '  Figma  ', page: 1 })).toBe('/admin?query=Figma');
    expect(buildAdminPageHref({ query: 'Figma', page: 2 })).toBe('/admin?query=Figma&page=2');
  });
});

describe('getAdminPageRange', () => {
  test('returns inclusive range for Supabase', () => {
    expect(getAdminPageRange(2)).toEqual({
      from: ADMIN_PAGE_SIZE,
      to: ADMIN_PAGE_SIZE * 2 - 1,
    });
  });
});

describe('getAdminPaginationMeta', () => {
  test('handles empty and populated datasets', () => {
    expect(getAdminPaginationMeta(0, 1)).toEqual({
      currentPage: 1,
      totalPages: 1,
      hasPreviousPage: false,
      hasNextPage: false,
      start: 0,
      end: 0,
    });

    expect(getAdminPaginationMeta(60, 3)).toEqual({
      currentPage: 3,
      totalPages: 3,
      hasPreviousPage: true,
      hasNextPage: false,
      start: 51,
      end: 60,
    });
  });
});

describe('escapeAdminSearchQuery', () => {
  test('escapes wildcard characters', () => {
    expect(escapeAdminSearchQuery('100%_match\\test')).toBe('100\\%\\_match\\\\test');
  });
});

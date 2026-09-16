import { createTranslator } from 'use-intl/core';
import { describe, expect, it } from 'vitest';
import enMessages from '../messages/en.json';
import koMessages from '../messages/ko.json';

describe('messages i18n formatting', () => {
  it('en search resultTitle interpolates query parameter correctly', () => {
    const t = createTranslator({ locale: 'en', messages: enMessages });
    const formatted = t('Search.page.resultTitle', { query: 'test-query' });
    expect(formatted).toContain('test-query');
    expect(formatted).not.toContain('{query}');
  });

  it('ko search resultTitle interpolates query parameter correctly', () => {
    const t = createTranslator({ locale: 'ko', messages: koMessages });
    const formatted = t('Search.page.resultTitle', { query: 'test-query' });
    expect(formatted).toContain('test-query');
    expect(formatted).not.toContain('{query}');
  });

  it('en search empty noResults interpolates query parameter correctly', () => {
    const t = createTranslator({ locale: 'en', messages: enMessages });
    const formatted = t('Search.list.empty.noResults', { query: 'test-query' });
    expect(formatted).toContain('test-query');
    expect(formatted).not.toContain('{query}');
  });

  it('ko search empty noResults interpolates query parameter correctly', () => {
    const t = createTranslator({ locale: 'ko', messages: koMessages });
    const formatted = t('Search.list.empty.noResults', { query: 'test-query' });
    expect(formatted).toContain('test-query');
    expect(formatted).not.toContain('{query}');
  });
});

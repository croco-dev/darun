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

  it('en Compare title interpolates name1 and name2 correctly', () => {
    const t = createTranslator({ locale: 'en', messages: enMessages });
    const formatted = t('Compare.title', { name1: 'Figma', name2: 'Sketch' });
    expect(formatted).toBe('Figma vs Sketch Comparison');
  });

  it('ko Compare title interpolates name1 and name2 correctly', () => {
    const t = createTranslator({ locale: 'ko', messages: koMessages });
    const formatted = t('Compare.title', { name1: '피그마', name2: '스케치' });
    expect(formatted).toBe('피그마 vs 스케치 비교');
  });

  it('Layout.footer.disclaimer does not contain raw html tags in en or ko', () => {
    const tEn = createTranslator({ locale: 'en', messages: enMessages });
    const tKo = createTranslator({ locale: 'ko', messages: koMessages });
    expect(tEn('Layout.footer.disclaimer')).not.toContain('<br');
    expect(tKo('Layout.footer.disclaimer')).not.toContain('<br');
  });
});

import { describe, expect, it } from 'vitest';
import { makeEntries } from '../app/sitemap-entries';

describe('makeEntries', () => {
  const BASE_URL = 'https://darun.io';
  const koUrl = `${BASE_URL}/ko/products/test-slug`;
  const enUrl = `${BASE_URL}/en/products/test-slug`;
  const date = new Date('2026-01-01');

  it('주어진 ko/en URL에 대해 2개 entry를 반환한다', () => {
    const entries = makeEntries(koUrl, enUrl, date);
    expect(entries).toHaveLength(2);
  });

  it('첫 번째 entry는 ko URL을 url로 가진다', () => {
    const entries = makeEntries(koUrl, enUrl, date);
    expect(entries[0].url).toBe(koUrl);
  });

  it('두 번째 entry는 en URL을 url로 가진다', () => {
    const entries = makeEntries(koUrl, enUrl, date);
    expect(entries[1].url).toBe(enUrl);
  });

  it('두 entry 모두 동일한 alternates 객체를 가진다', () => {
    const entries = makeEntries(koUrl, enUrl, date);
    expect(entries[0].alternates).toEqual(entries[1].alternates);
  });

  it('alternates는 ko, en, x-default를 포함한다', () => {
    const entries = makeEntries(koUrl, enUrl, date);
    const alt = entries[0].alternates!.languages;
    expect(alt).toHaveProperty('ko', koUrl);
    expect(alt).toHaveProperty('en', enUrl);
    expect(alt).toHaveProperty('x-default', koUrl);
  });

  it('lastModified가 전달된 date와 일치한다', () => {
    const entries = makeEntries(koUrl, enUrl, date);
    expect(entries[0].lastModified).toBe(date);
    expect(entries[1].lastModified).toBe(date);
  });

  it('ko와 en entry의 url은 서로 다르다', () => {
    const urlA = `${BASE_URL}/ko/products/a`;
    const urlB = `${BASE_URL}/en/products/a`;
    const result = makeEntries(urlA, urlB, date);
    expect(result[0].url).not.toBe(result[1].url);
  });
});

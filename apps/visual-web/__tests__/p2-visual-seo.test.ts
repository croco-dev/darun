import { describe, expect, it } from 'vitest';
import { buildVisualSitemapEntries, VISUAL_SITEMAP_SIZE } from '../app/sitemap';

describe('P2 visual sitemap', () => {
  it('최근 N건 크기로 고정된다', () => {
    expect(VISUAL_SITEMAP_SIZE).toBe(100);
  });

  it('정적 경로와 상세를 포함한다', () => {
    const entries = buildVisualSitemapEntries(['shot-1'], ['flow-1']);
    const urls = entries.map(entry => entry.url);
    expect(urls).toEqual([
      'https://visual.darun.io/',
      'https://visual.darun.io/flows',
      'https://visual.darun.io/apps',
      'https://visual.darun.io/screenshots/shot-1',
      'https://visual.darun.io/flows/flow-1',
    ]);
  });
});

describe('P2 visual canonical', () => {
  it('상세 canonical 경로를 만든다', () => {
    expect(`/screenshots/${encodeURIComponent('shot-1')}`).toBe('/screenshots/shot-1');
    expect(`/flows/${encodeURIComponent('flow-1')}`).toBe('/flows/flow-1');
    expect(`/apps/${encodeURIComponent('toss')}`).toBe('/apps/toss');
  });
});

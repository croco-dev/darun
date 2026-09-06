import { describe, expect, it } from 'vitest';
import { NO_INDEX_ROBOTS } from '../lib/seo/indexability';
import {
  buildHomePageMetadata,
  buildRootLayoutMetadata,
  getOgLocale,
  getSiteName,
  SITE_COPY,
} from '../lib/seo/metadata';

describe('SEO Metadata Helpers', () => {
  describe('Site identity and copy', () => {
    it('returns consistent site name', () => {
      expect(getSiteName()).toBe('다른(darun)');
    });

    it('returns valid OG locales', () => {
      expect(getOgLocale('ko')).toBe('ko_KR');
      expect(getOgLocale('en')).toBe('en_US');
    });

    it('defines distinct localized copy for ko and en', () => {
      expect(SITE_COPY.ko.title).toContain('다른');
      expect(SITE_COPY.en.title).toContain('Darun');
      expect(SITE_COPY.ko.rankingTitle).toContain('인기 서비스 랭킹');
      expect(SITE_COPY.en.rankingTitle).toContain('Top 30');
    });
  });

  describe('buildRootLayoutMetadata', () => {
    it('provides metadataBase with canonical origin', () => {
      const metadata = buildRootLayoutMetadata();
      expect(metadata.metadataBase?.toString()).toBe('https://www.darun.io/');
    });

    it('does NOT set canonical in root layout to prevent deep page inheritance', () => {
      const metadata = buildRootLayoutMetadata();
      expect(metadata.alternates?.canonical).toBeUndefined();
    });
  });

  describe('buildHomePageMetadata', () => {
    it('sets self-canonical and alternates for Korean homepage', () => {
      const metadata = buildHomePageMetadata('ko');
      expect(metadata.alternates?.canonical).toBe('https://www.darun.io/ko');
      expect(metadata.alternates?.languages?.ko).toBe('https://www.darun.io/ko');
      expect(metadata.alternates?.languages?.en).toBe('https://www.darun.io/en');
      expect(metadata.alternates?.languages?.['x-default']).toBe('https://www.darun.io/ko');
      expect(metadata.alternates?.types?.['text/markdown']).toBe('https://www.darun.io/ko.md');
      expect(metadata.openGraph?.url).toBe('https://www.darun.io/ko');
    });

    it('sets self-canonical and alternates for English homepage', () => {
      const metadata = buildHomePageMetadata('en');
      expect(metadata.alternates?.canonical).toBe('https://www.darun.io/en');
      expect(metadata.alternates?.languages?.ko).toBe('https://www.darun.io/ko');
      expect(metadata.alternates?.languages?.en).toBe('https://www.darun.io/en');
      expect(metadata.alternates?.languages?.['x-default']).toBe('https://www.darun.io/ko');
      expect(metadata.alternates?.types?.['text/markdown']).toBe('https://www.darun.io/en.md');
      expect(metadata.openGraph?.url).toBe('https://www.darun.io/en');
    });
  });

  describe('Indexability constants', () => {
    it('defines NO_INDEX_ROBOTS as { index: false, follow: true }', () => {
      expect(NO_INDEX_ROBOTS).toEqual({ index: false, follow: true });
    });
  });
});

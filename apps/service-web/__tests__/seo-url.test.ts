import { describe, expect, it } from 'vitest';
import {
  absolutePublicUrl,
  buildAlternates,
  cleanPathname,
  markdownSiblingUrl,
  publicPath,
  PUBLIC_ORIGIN,
} from '../lib/seo/url';

describe('SEO URL Helpers', () => {
  describe('PUBLIC_ORIGIN', () => {
    it('uses https://www.darun.io canonical origin', () => {
      expect(PUBLIC_ORIGIN).toBe('https://www.darun.io');
    });
  });

  describe('cleanPathname', () => {
    it('normalizes leading slash and removes trailing slash', () => {
      expect(cleanPathname('products/notion/')).toBe('/products/notion');
      expect(cleanPathname('/products/notion')).toBe('/products/notion');
    });

    it('strips query strings and hashes', () => {
      expect(cleanPathname('/products/notion?from=search#features')).toBe('/products/notion');
    });

    it('removes existing locale prefixes cleanly', () => {
      expect(cleanPathname('/ko/products/notion')).toBe('/products/notion');
      expect(cleanPathname('/en/products/notion')).toBe('/products/notion');
      expect(cleanPathname('/ko')).toBe('');
      expect(cleanPathname('/en/')).toBe('');
    });

    it('handles root correctly', () => {
      expect(cleanPathname('/')).toBe('/');
      expect(cleanPathname('')).toBe('');
    });
  });

  describe('publicPath and absolutePublicUrl', () => {
    it('generates locale paths without trailing slash for root', () => {
      expect(publicPath('ko', '/')).toBe('/ko');
      expect(publicPath('en', '')).toBe('/en');
      expect(absolutePublicUrl('ko', '/')).toBe('https://www.darun.io/ko');
      expect(absolutePublicUrl('en', '/')).toBe('https://www.darun.io/en');
    });

    it('generates locale paths for deep pages', () => {
      expect(publicPath('ko', '/products/notion')).toBe('/ko/products/notion');
      expect(publicPath('en', '/products/notion')).toBe('/en/products/notion');
      expect(absolutePublicUrl('ko', '/products/notion')).toBe('https://www.darun.io/ko/products/notion');
      expect(absolutePublicUrl('en', '/products/notion')).toBe('https://www.darun.io/en/products/notion');
    });

    it('generates markdown sibling URLs', () => {
      expect(markdownSiblingUrl('ko', '/')).toBe('https://www.darun.io/ko.md');
      expect(markdownSiblingUrl('en', '/products/notion')).toBe('https://www.darun.io/en/products/notion.md');
    });
  });

  describe('buildAlternates', () => {
    it('creates canonical, ko, en, and x-default for a given path', () => {
      const alternates = buildAlternates({ locale: 'en', pathname: '/products/notion' });

      expect(alternates.canonical).toBe('https://www.darun.io/en/products/notion');
      expect(alternates.languages.ko).toBe('https://www.darun.io/ko/products/notion');
      expect(alternates.languages.en).toBe('https://www.darun.io/en/products/notion');
      expect(alternates.languages['x-default']).toBe('https://www.darun.io/ko/products/notion');
      expect(alternates.types).toBeUndefined();
    });

    it('includes markdown alternate type when requested', () => {
      const alternates = buildAlternates({
        locale: 'ko',
        pathname: '/products/notion',
        includeMarkdownAlternate: true,
      });

      expect(alternates.types?.['text/markdown']).toBe('https://www.darun.io/ko/products/notion.md');
    });
  });
});

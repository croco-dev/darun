import { describe, expect, it } from 'vitest';
import {
  getLocalizedCompanyAddress,
  getLocalizedCompanyType,
  getLocalizedLinkTitle,
  getLocalizedTag,
} from '../utils/localization';

describe('localization utils', () => {
  describe('getLocalizedTag', () => {
    it('returns English translation when locale is en and tag is known', () => {
      expect(getLocalizedTag('쇼핑', 'en')).toBe('Shopping');
      expect(getLocalizedTag('개발자 도구', 'en')).toBe('Developer Tools');
    });

    it('returns original tag when locale is ko', () => {
      expect(getLocalizedTag('쇼핑', 'ko')).toBe('쇼핑');
    });

    it('returns original tag when English translation is not found', () => {
      expect(getLocalizedTag('미등록태그', 'en')).toBe('미등록태그');
    });
  });

  describe('getLocalizedLinkTitle', () => {
    it('returns English translation when locale is en and title is known', () => {
      expect(getLocalizedLinkTitle('공식 홈페이지', 'en')).toBe('Official Website');
      expect(getLocalizedLinkTitle('고객센터', 'en')).toBe('Customer Support');
    });

    it('returns original title when locale is ko', () => {
      expect(getLocalizedLinkTitle('공식 홈페이지', 'ko')).toBe('공식 홈페이지');
    });

    it('returns original title when translation is not found', () => {
      expect(getLocalizedLinkTitle('기타 링크', 'en')).toBe('기타 링크');
    });
  });

  describe('getLocalizedCompanyType', () => {
    it('returns English translation for known corporate entity types', () => {
      expect(getLocalizedCompanyType('주식회사', 'en')).toBe('Corporation');
      expect(getLocalizedCompanyType('유한회사', 'en')).toBe('Limited Liability Company');
    });

    it('returns original type when locale is ko', () => {
      expect(getLocalizedCompanyType('주식회사', 'ko')).toBe('주식회사');
    });

    it('handles undefined or null cleanly', () => {
      expect(getLocalizedCompanyType(undefined, 'en')).toBeUndefined();
      expect(getLocalizedCompanyType(null, 'en')).toBeUndefined();
    });
  });

  describe('getLocalizedCompanyAddress', () => {
    it('returns English translation for known address regions', () => {
      expect(getLocalizedCompanyAddress('미국 워싱턴주', 'en')).toBe('Washington, United States');
      expect(getLocalizedCompanyAddress('미국', 'en')).toBe('United States');
    });

    it('returns original address when locale is ko or address unknown', () => {
      expect(getLocalizedCompanyAddress('미국 워싱턴주', 'ko')).toBe('미국 워싱턴주');
      expect(getLocalizedCompanyAddress('서울시 강남구', 'en')).toBe('서울시 강남구');
    });

    it('handles undefined or null cleanly', () => {
      expect(getLocalizedCompanyAddress(undefined, 'en')).toBeUndefined();
      expect(getLocalizedCompanyAddress(null, 'en')).toBeUndefined();
    });
  });
});

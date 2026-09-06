import type { Metadata } from 'next';
import { buildAlternates, type PublicLocale, PUBLIC_ORIGIN } from './url';

const SITE_NAME = '다른(darun)';
const OG_IMAGE_URL = 'https://darun-image.doda.dev/?format=png';

const LOCALE_TO_OG_LOCALE: Record<PublicLocale, string> = {
  ko: 'ko_KR',
  en: 'en_US',
};

export const SITE_COPY: Record<
  PublicLocale,
  {
    title: string;
    description: string;
    ogImageAlt: string;
    rankingTitle: string;
    rankingDescription: string;
    categoriesTitle: string;
    categoriesDescription: string;
    searchTitle: string;
    searchDescription: string;
    aboutTitle: string;
    aboutDescription: string;
  }
> = {
  ko: {
    title: '다른 - 서비스 비교를 한 곳에서',
    description:
      '서비스의 특징과 대안을 한곳에서 찾고 비교합니다. 다양한 소프트웨어, 웹사이트, 어플리케이션을 검색하고 정보를 확인해보세요.',
    ogImageAlt: '서비스의 특징과 대안을 한곳에서 찾고 비교합니다',
    rankingTitle: '인기 서비스 랭킹 Top 30 - 다른',
    rankingDescription: '가장 많은 관심을 받은 서비스들의 랭킹입니다. 다양한 인기 서비스의 특징과 대안을 확인해보세요.',
    categoriesTitle: '서비스 카테고리 - 다른',
    categoriesDescription: '카테고리별로 다양한 서비스와 대안을 찾아보세요.',
    searchTitle: '서비스 검색 - 다른',
    searchDescription: '찾으시는 서비스의 특징과 대안을 검색해보세요.',
    aboutTitle: '다른 소개 및 안내 - 다른',
    aboutDescription: '서비스 발견 및 비교 플랫폼 다른(darun)의 서비스 소개와 안내입니다.',
  },
  en: {
    title: 'Darun - Compare Services in One Place',
    description:
      'Discover and compare software, websites, and applications in one place. Explore features, alternatives, and company info.',
    ogImageAlt: 'Discover and compare software, websites, and applications in one place',
    rankingTitle: 'Top 30 Popular Services - Darun',
    rankingDescription:
      'Rankings of services receiving the most attention. Explore features and alternatives of popular services.',
    categoriesTitle: 'Service Categories - Darun',
    categoriesDescription: 'Browse services and alternatives by category.',
    searchTitle: 'Search Services - Darun',
    searchDescription: 'Search for software, tools, and alternatives on Darun.',
    aboutTitle: 'About Darun - Service Overview',
    aboutDescription: 'Learn about Darun, a discovery and comparison platform for web services and applications.',
  },
};

export function getSiteName(): string {
  return SITE_NAME;
}

export function getOgLocale(locale: PublicLocale): string {
  return LOCALE_TO_OG_LOCALE[locale] ?? 'ko_KR';
}

export function buildRootLayoutMetadata(): Metadata {
  return {
    metadataBase: new URL(PUBLIC_ORIGIN),
    title: {
      default: SITE_COPY.ko.title,
      template: '%s',
    },
    description: SITE_COPY.ko.description,
    openGraph: {
      siteName: SITE_NAME,
      type: 'website',
      images: [
        {
          url: OG_IMAGE_URL,
          width: 1200,
          height: 630,
          alt: SITE_COPY.ko.ogImageAlt,
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      images: [OG_IMAGE_URL],
    },
    // We intentionally do not set root canonical here so child pages own their canonical identity
  };
}

export function buildHomePageMetadata(locale: PublicLocale): Metadata {
  const copy = SITE_COPY[locale];
  const alternates = buildAlternates({ locale, pathname: '/', includeMarkdownAlternate: true });
  const canonicalUrl = alternates.canonical;

  return {
    title: copy.title,
    description: copy.description,
    alternates,
    openGraph: {
      title: copy.title,
      description: copy.description,
      url: canonicalUrl,
      siteName: SITE_NAME,
      type: 'website',
      locale: getOgLocale(locale),
      images: [
        {
          url: OG_IMAGE_URL,
          width: 1200,
          height: 630,
          alt: copy.ogImageAlt,
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title: copy.title,
      description: copy.description,
      images: [OG_IMAGE_URL],
    },
  };
}

import type { ProductLinkRole } from '@darun/provider-graphql';
import { isDarunImageRemoteUrl } from '@darun/ui/image-origins';

const whiteGlobeUrl =
  'https://res.cloudinary.com/dqddtkvmb/image/upload/v1709304777/images/icons/links/pvjgv9btsktstjkoarrl.svg';

export const productLinkIconOptions = [
  { value: whiteGlobeUrl, label: '지구본 (흰색)' },
  {
    value: 'https://res.cloudinary.com/dqddtkvmb/image/upload/v1709304777/images/icons/links/hdo1rx06frvuhf5q0gio.svg',
    label: '인스타그램 (그레이)',
  },
  {
    value: 'https://res.cloudinary.com/dqddtkvmb/image/upload/v1709304777/images/icons/links/i9ea1d250oskdzvu7iby.svg',
    label: 'X(Twitter) (그레이)',
  },
  {
    value: 'https://res.cloudinary.com/dqddtkvmb/image/upload/v1709304776/images/icons/links/kiezpv3buqv7w8xajhw4.svg',
    label: 'GitHub (검정)',
  },
];

export function productLinkIconNeedsDarkBackground(src: string) {
  return src === whiteGlobeUrl;
}

export const productLinkRoleLabels = {
  official: { ko: '공식 사이트', en: 'Official website' },
  download: { ko: '다운로드', en: 'Download' },
  documentation: { ko: '문서', en: 'Documentation' },
  social: { ko: '소셜', en: 'Social media' },
  other: { ko: '기타', en: 'Other link' },
} satisfies Record<ProductLinkRole, { ko: string; en: string }>;

const englishLinkTitles = new Map([
  ['공식 홈페이지', 'Official Website'],
  ['홈페이지', 'Website'],
  ['웹사이트', 'Website'],
  ['고객센터', 'Customer Support'],
  ['문의하기', 'Contact Us'],
  ['블로그', 'Blog'],
  ['다운로드', 'Download'],
  ['앱스토어', 'App Store'],
  ['구글플레이', 'Google Play'],
  ['문서', 'Documentation'],
  ['가격 안내', 'Pricing'],
]);

export function getProductLinkLabel(
  link: {
    title: string;
    role?: ProductLinkRole | null;
    displayLink: string;
    link: string;
  },
  locale = 'ko'
) {
  if (link.title.trim()) return locale === 'en' ? (englishLinkTitles.get(link.title) ?? link.title) : link.title;
  if (link.role) return productLinkRoleLabels[link.role][locale === 'en' ? 'en' : 'ko'];
  return link.displayLink || link.link;
}

export function orderPublicProductLinks<T extends { isPrimary: boolean }>(links: readonly T[]): T[] {
  return [...links].sort((a, b) => Number(b.isPrimary) - Number(a.isPrimary));
}

export function getProductLinkIconSource(
  iconUrl: string | null | undefined,
  productLogoUrl: string | null | undefined
) {
  if (!iconUrl) return null;
  const localOrigin = 'https://darun.invalid';
  try {
    const url = new URL(iconUrl, localOrigin);
    if (iconUrl.startsWith('/') && url.origin === localOrigin && url.pathname.startsWith('/images/')) {
      return url.pathname + url.search;
    }
    if (isDarunImageRemoteUrl(url)) return url.href;
    // Research registration also saves the displayed product logo as the visit link's icon.
    if (
      iconUrl === productLogoUrl &&
      url.origin !== localOrigin &&
      (url.protocol === 'https:' || url.protocol === 'http:') &&
      !url.username &&
      !url.password
    ) {
      return url.href;
    }
  } catch {
    // Fall back for malformed persisted icon URLs.
  }
  return null;
}

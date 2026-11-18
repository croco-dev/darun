import type { ProductLinkRole } from '@darun/provider-graphql';

export const productLinkRoleLabels = {
  official: { ko: '공식 사이트', en: 'Official website' },
  download: { ko: '다운로드', en: 'Download' },
  documentation: { ko: '문서', en: 'Documentation' },
  social: { ko: '소셜', en: 'Social media' },
  other: { ko: '기타', en: 'Other link' },
} satisfies Record<ProductLinkRole, { ko: string; en: string }>;

export function getProductLinkLabel(
  link: {
    title: string;
    role?: ProductLinkRole | null;
    displayLink: string;
    link: string;
  },
  locale = 'ko'
) {
  if (link.title.trim()) return link.title;
  if (link.role) return productLinkRoleLabels[link.role][locale === 'en' ? 'en' : 'ko'];
  return link.displayLink || link.link;
}

export function orderPublicProductLinks<T extends { isPrimary: boolean }>(links: readonly T[]): T[] {
  return [...links].sort((a, b) => Number(b.isPrimary) - Number(a.isPrimary));
}

export function getProductLinkIconSource(iconUrl: string | null | undefined) {
  if (!iconUrl) return null;
  const localOrigin = 'https://darun.invalid';
  try {
    const url = new URL(iconUrl, localOrigin);
    if (iconUrl.startsWith('/') && url.origin === localOrigin && url.pathname.startsWith('/images/')) {
      return url.pathname + url.search;
    }
    // These images load directly in the browser. Use the apps' configured image origins.
    if (
      url.protocol === 'https:' &&
      !url.username &&
      !url.password &&
      (url.origin === 'https://res.cloudinary.com' || url.origin === 'https://via.placeholder.com')
    ) {
      return url.href;
    }
  } catch {
    // Fall back for malformed persisted icon URLs.
  }
  return null;
}

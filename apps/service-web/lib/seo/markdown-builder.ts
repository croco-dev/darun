import { absolutePublicUrl, PublicLocale } from './url';

export function escapeMarkdown(text: string): string {
  return text
    .replace(/\\/g, '\\\\')
    .replace(/\[/g, '\\[')
    .replace(/\]/g, '\\]')
    .replace(/\(/g, '\\(')
    .replace(/\)/g, '\\)')
    .replace(/`/g, '\\`')
    .replace(/\*/g, '\\*')
    .replace(/_/g, '\\_')
    .replace(/#/g, '\\#');
}

export function safeUrl(rawUrl: string | null | undefined): string | null {
  if (!rawUrl || typeof rawUrl !== 'string') return null;
  const trimmed = rawUrl.trim();
  try {
    const parsed = new URL(trimmed);
    if (parsed.protocol === 'http:' || parsed.protocol === 'https:') {
      return parsed.href;
    }
    return null;
  } catch {
    return null;
  }
}

export function htmlToMarkdown(html: string): string {
  if (!html) return '';

  let md = html;

  // Replace script and style tags completely
  md = md.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
  md = md.replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '');

  // Convert headings (h1, h2, h3, h4) into H3 for description hierarchy
  md = md.replace(/<h[1-6][^>]*>([\s\S]*?)<\/h[1-6]>/gi, (_match, text) => `\n\n### ${text.trim()}\n\n`);

  // Blockquotes
  md = md.replace(/<blockquote[^>]*>([\s\S]*?)<\/blockquote>/gi, (_match, text) => `\n\n> ${text.trim()}\n\n`);

  // Unordered list items
  md = md.replace(/<li[^>]*>([\s\S]*?)<\/li>/gi, (_match, text) => `\n* ${text.trim()}`);

  // Paragraphs
  md = md.replace(/<p[^>]*>([\s\S]*?)<\/p>/gi, (_match, text) => `\n\n${text.trim()}\n\n`);

  // Line breaks
  md = md.replace(/<br\s*\/?>/gi, '\n');

  // Bold & Italics
  md = md.replace(/<(?:strong|b)[^>]*>([\s\S]*?)<\/(?:strong|b)>/gi, '**$1**');
  md = md.replace(/<(?:em|i)[^>]*>([\s\S]*?)<\/(?:em|i)>/gi, '*$1*');

  // Strip all other HTML tags
  md = md.replace(/<[^>]+>/g, '');

  // Decode common HTML entities
  md = md
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, ' ');

  // Collapse multiple blank lines
  md = md.replace(/\n{3,}/g, '\n\n').trim();

  return md;
}

export function buildHomeMarkdown(params: {
  locale: PublicLocale;
  categories: Array<{ slug: string; label: string }>;
  featuredProducts: Array<{ slug: string; name: string; summary?: string | null }>;
}): string {
  const { locale, categories, featuredProducts } = params;
  const isKo = locale === 'ko';

  const siteTitle = isKo ? '다른(darun)' : 'Darun';
  const siteDesc = isKo
    ? '다른 팀이 손수 비교하고 검증한 서비스들을 찾고, 쓰고, 비교하는 플랫폼입니다.'
    : 'A platform to discover, compare, and evaluate software tools and services curated by the Darun team.';

  const lines: string[] = [
    `# ${siteTitle}`,
    '',
    siteDesc,
    '',
    `Canonical URL: ${absolutePublicUrl(locale, '')}`,
    '',
    isKo ? '## 카테고리' : '## Categories',
    '',
  ];

  for (const cat of categories) {
    const url = absolutePublicUrl(locale, `/categories/${cat.slug}`);
    lines.push(`- [${escapeMarkdown(cat.label)}](${url})`);
  }

  if (featuredProducts.length > 0) {
    lines.push('');
    lines.push(isKo ? '## 주요 서비스' : '## Featured Services');
    lines.push('');
    for (const prod of featuredProducts) {
      const url = absolutePublicUrl(locale, `/products/${prod.slug}`);
      const summaryText = prod.summary ? ` — ${escapeMarkdown(prod.summary)}` : '';
      lines.push(`- [${escapeMarkdown(prod.name)}](${url})${summaryText}`);
    }
  }

  lines.push('');
  lines.push(isKo ? '## 사이트 안내' : '## About');
  lines.push('');
  lines.push(
    `- [${isKo ? '소개 및 편집 방침' : 'About and Editorial Policy'}](${absolutePublicUrl(locale, '/about')})`
  );
  lines.push(`- [${isKo ? '인기 순위' : 'Rankings'}](${absolutePublicUrl(locale, '/ranking')})`);

  return lines.join('\n');
}

export function buildProductMarkdown(params: {
  locale: PublicLocale;
  product: {
    name: string;
    slug: string;
    summary?: string | null;
    description?: string | null;
    updatedAt?: Date | string | null;
    publishedAt?: Date | string | null;
    features?: Array<{ name: string; emoji?: string | null; summary?: string | null }>;
    tags?: Array<{ name: string }>;
    company?: { name: string; websiteUrl?: string | null } | null;
    links?: Array<{ title?: string | null; url: string; isPrimary?: boolean }>;
  };
  alternatives?: Array<{ name: string; slug: string; summary?: string | null }>;
}): string {
  const { locale, product, alternatives = [] } = params;
  const isKo = locale === 'ko';
  const canonicalUrl = absolutePublicUrl(locale, `/products/${product.slug}`);

  const lines: string[] = [`# ${escapeMarkdown(product.name)}`, '', `Canonical URL: ${canonicalUrl}`];

  if (product.summary) {
    lines.push('', escapeMarkdown(product.summary));
  }

  if (product.tags && product.tags.length > 0) {
    lines.push('', `Tags: ${product.tags.map(t => escapeMarkdown(t.name)).join(', ')}`);
  }

  if (product.description) {
    lines.push('', isKo ? '## 서비스 소개' : '## Overview', '', htmlToMarkdown(product.description));
  }

  if (product.features && product.features.length > 0) {
    lines.push('', isKo ? '## 주요 기능' : '## Features', '');
    for (const feat of product.features) {
      const emojiPrefix = feat.emoji ? `${feat.emoji} ` : '';
      const summaryText = feat.summary ? `: ${escapeMarkdown(feat.summary)}` : '';
      lines.push(`- ${emojiPrefix}**${escapeMarkdown(feat.name)}**${summaryText}`);
    }
  }

  if (alternatives.length > 0) {
    lines.push('', isKo ? '## 대안 서비스' : '## Alternatives', '');
    for (const alt of alternatives) {
      const altUrl = absolutePublicUrl(locale, `/products/${alt.slug}`);
      const summaryText = alt.summary ? ` — ${escapeMarkdown(alt.summary)}` : '';
      lines.push(`- [${escapeMarkdown(alt.name)}](${altUrl})${summaryText}`);
    }
    const allAltsUrl = absolutePublicUrl(locale, `/products/${product.slug}/alternatives`);
    lines.push('', `[${isKo ? '대안 서비스 전체보기' : 'View all alternatives'}](${allAltsUrl})`);
  }

  if (product.company) {
    lines.push('', isKo ? '## 회사 정보' : '## Company', '');
    lines.push(`- ${isKo ? '회사명' : 'Company'}: ${escapeMarkdown(product.company.name)}`);
    const verifiedUrl = safeUrl(product.company.websiteUrl);
    if (verifiedUrl) {
      lines.push(`- ${isKo ? '웹사이트' : 'Website'}: [${escapeMarkdown(verifiedUrl)}](${verifiedUrl})`);
    }
  }

  if (product.links && product.links.length > 0) {
    const validLinks = product.links
      .map(l => ({ ...l, verified: safeUrl(l.url) }))
      .filter((l): l is typeof l & { verified: string } => l.verified !== null);

    if (validLinks.length > 0) {
      lines.push('', isKo ? '## 외부 서비스 링크' : '## External Links', '');
      for (const link of validLinks) {
        const title = link.title ? escapeMarkdown(link.title) : link.verified;
        lines.push(`- [${title}](${link.verified})`);
      }
    }
  }

  const timestamp = product.updatedAt ?? product.publishedAt;
  if (timestamp) {
    const dateStr = typeof timestamp === 'string' ? timestamp : timestamp.toISOString();
    lines.push('', `---`, `${isKo ? '최종 수정' : 'Last modified'}: ${dateStr}`);
  }

  return lines.join('\n');
}

export function buildProductAlternativesMarkdown(params: {
  locale: PublicLocale;
  product: { name: string; slug: string };
  alternatives: Array<{ name: string; slug: string; summary?: string | null }>;
}): string {
  const { locale, product, alternatives } = params;
  const isKo = locale === 'ko';
  const canonicalUrl = absolutePublicUrl(locale, `/products/${product.slug}/alternatives`);

  const title = isKo ? `${product.name}의 대안 서비스` : `Alternatives to ${product.name}`;
  const lines: string[] = [
    `# ${escapeMarkdown(title)}`,
    '',
    `Canonical URL: ${canonicalUrl}`,
    '',
    isKo
      ? `[${escapeMarkdown(product.name)}](${absolutePublicUrl(locale, `/products/${product.slug}`)}) 서비스와 유사한 기능을 제공하는 대안 소프트웨어 목록입니다.`
      : `Alternative tools and software offering similar functionality to [${escapeMarkdown(product.name)}](${absolutePublicUrl(locale, `/products/${product.slug}`)}).`,
    '',
  ];

  if (alternatives.length === 0) {
    lines.push(isKo ? '등록된 대안 서비스가 없습니다.' : 'No alternatives available.');
  } else {
    for (const alt of alternatives) {
      const url = absolutePublicUrl(locale, `/products/${alt.slug}`);
      const summaryText = alt.summary ? ` — ${escapeMarkdown(alt.summary)}` : '';
      lines.push(`- [${escapeMarkdown(alt.name)}](${url})${summaryText}`);
    }
  }

  return lines.join('\n');
}

export function buildCategoryMarkdown(params: {
  locale: PublicLocale;
  category: { slug: string; label: string };
  products: Array<{ name: string; slug: string; summary?: string | null }>;
}): string {
  const { locale, category, products } = params;
  const isKo = locale === 'ko';
  const canonicalUrl = absolutePublicUrl(locale, `/categories/${category.slug}`);

  const lines: string[] = [
    `# ${escapeMarkdown(category.label)}`,
    '',
    `Canonical URL: ${canonicalUrl}`,
    '',
    isKo
      ? `${category.label} 카테고리에 속한 서비스 목록입니다.`
      : `Software, tools, and services in the ${category.label} category.`,
    '',
    isKo ? '## 서비스 목록' : '## Services',
    '',
  ];

  if (products.length === 0) {
    lines.push(isKo ? '등록된 서비스가 없습니다.' : 'No services in this category.');
  } else {
    for (const prod of products) {
      const url = absolutePublicUrl(locale, `/products/${prod.slug}`);
      const summaryText = prod.summary ? ` — ${escapeMarkdown(prod.summary)}` : '';
      lines.push(`- [${escapeMarkdown(prod.name)}](${url})${summaryText}`);
    }
  }

  return lines.join('\n');
}

export function buildRankingMarkdown(params: {
  locale: PublicLocale;
  products: Array<{ name: string; slug: string; summary?: string | null; voteCount?: number }>;
}): string {
  const { locale, products } = params;
  const isKo = locale === 'ko';
  const canonicalUrl = absolutePublicUrl(locale, '/ranking');

  const lines: string[] = [
    `# ${isKo ? '인기 서비스 순위' : 'Service Rankings'}`,
    '',
    `Canonical URL: ${canonicalUrl}`,
    '',
    isKo ? '다른(darun)에서 집계한 인기 서비스 순위입니다.' : 'Rankings of popular software services on Darun.',
    '',
  ];

  products.forEach((prod, index) => {
    const rank = index + 1;
    const url = absolutePublicUrl(locale, `/products/${prod.slug}`);
    const summaryText = prod.summary ? ` — ${escapeMarkdown(prod.summary)}` : '';
    lines.push(`${rank}. [${escapeMarkdown(prod.name)}](${url})${summaryText}`);
  });

  return lines.join('\n');
}

export function buildCompareMarkdown(params: {
  locale: PublicLocale;
  product1: { name: string; slug: string; summary?: string | null; description?: string | null };
  product2: { name: string; slug: string; summary?: string | null; description?: string | null };
}): string {
  const { locale, product1, product2 } = params;
  const isKo = locale === 'ko';
  const canonicalUrl = absolutePublicUrl(locale, `/compare/${product1.slug}/${product2.slug}`);

  const lines: string[] = [
    `# ${escapeMarkdown(product1.name)} vs ${escapeMarkdown(product2.name)}`,
    '',
    `Canonical URL: ${canonicalUrl}`,
    '',
    `## 1. [${escapeMarkdown(product1.name)}](${absolutePublicUrl(locale, `/products/${product1.slug}`)})`,
    '',
    product1.summary ? escapeMarkdown(product1.summary) : '',
    '',
    product1.description ? htmlToMarkdown(product1.description) : '',
    '',
    `## 2. [${escapeMarkdown(product2.name)}](${absolutePublicUrl(locale, `/products/${product2.slug}`)})`,
    '',
    product2.summary ? escapeMarkdown(product2.summary) : '',
    '',
    product2.description ? htmlToMarkdown(product2.description) : '',
  ];

  return lines.join('\n');
}

export function buildMagazineMarkdown(params: {
  locale: PublicLocale;
  magazine: {
    title: string;
    slug: string;
    body?: string | null;
    publishedAt?: Date | string | null;
    authorName?: string | null;
  };
}): string {
  const { locale, magazine } = params;
  const canonicalUrl = absolutePublicUrl(locale, `/magazines/${magazine.slug}`);

  const lines: string[] = [`# ${escapeMarkdown(magazine.title)}`, '', `Canonical URL: ${canonicalUrl}`];

  if (magazine.authorName) {
    lines.push(`Author: ${escapeMarkdown(magazine.authorName)}`);
  }

  if (magazine.publishedAt) {
    const dateStr =
      typeof magazine.publishedAt === 'string' ? magazine.publishedAt : magazine.publishedAt.toISOString();
    lines.push(`Date: ${dateStr}`);
  }

  if (magazine.body) {
    lines.push('', htmlToMarkdown(magazine.body));
  }

  return lines.join('\n');
}

export function buildNotFoundMarkdown(params: { locale: PublicLocale }): string {
  const { locale } = params;
  const isKo = locale === 'ko';

  const lines: string[] = [
    `# ${isKo ? '페이지를 찾을 수 없습니다' : 'Page Not Found'}`,
    '',
    isKo ? '요청하신 페이지가 존재하지 않거나 이동되었습니다.' : 'The requested page does not exist or has been moved.',
    '',
    isKo ? '## 바로가기' : '## Helpful Links',
    '',
    `- [${isKo ? '홈' : 'Home'}](${absolutePublicUrl(locale, '')})`,
    `- [${isKo ? '검색' : 'Search'}](${absolutePublicUrl(locale, '/search/product')})`,
    `- [${isKo ? '순위' : 'Rankings'}](${absolutePublicUrl(locale, '/ranking')})`,
    `- [Sitemap](${absolutePublicUrl(locale, '/sitemap.xml')})`,
    `- [llms.txt](${absolutePublicUrl(locale, '/llms.txt')})`,
  ];

  return lines.join('\n');
}

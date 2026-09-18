import { gql } from '@apollo/client';
import { CategoryProductSection } from '@darun/products-shell';
import { Layout } from '@darun/ui-layout';
import { Metadata } from 'next';
import { notFound } from '@darun/utils-router';
import { cache } from 'react';
import { NO_INDEX_ROBOTS } from '../../../../lib/seo/indexability';
import { JsonLd } from '../../../../lib/seo/json-ld';
import { getOgLocale, getSiteName } from '../../../../lib/seo/metadata';
import { absolutePublicUrl, buildAlternates, normalizeLocale } from '../../../../lib/seo/url';
import { getClient } from '../../../getServerClient';

type Props = {
  params: Promise<{ slug: string; locale: string }>;
};

const categoryQuery = gql`
  query CategoryBySlugOnCategoryPageMetadata($first: Int!, $locale: String!) {
    categories(first: $first, locale: $locale) {
      id
      slug
      labelKo
      labelEn
    }
  }
`;

type CategoryQueryData = {
  categories: { id: string; slug: string; labelKo: string; labelEn: string }[];
};

const getCategory = cache(async (slug: string, locale: string) => {
  const { data } = await getClient().query<CategoryQueryData>({
    query: categoryQuery,
    variables: { first: 100, locale },
  });

  return data?.categories.find(c => c.slug === slug) ?? null;
});

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug, locale } = await params;
  const currentLocale = normalizeLocale(locale);
  const category = await getCategory(slug, currentLocale);

  if (!category) {
    return {
      title: currentLocale === 'en' ? 'Category - Darun' : '카테고리 - 다른',
      description: currentLocale === 'en' ? 'Service category on Darun.' : '서비스 카테고리입니다.',
      robots: NO_INDEX_ROBOTS,
    };
  }

  const label = currentLocale === 'ko' ? category.labelKo : category.labelEn;
  const title = currentLocale === 'ko' ? `${label} 카테고리 - 다른` : `${label} Category - Darun`;
  const description =
    currentLocale === 'ko'
      ? `${label} 서비스들의 특징과 대안을 확인해보세요.`
      : `Explore ${label} software, tools, and alternatives on Darun.`;

  const alternates = buildAlternates({
    locale: currentLocale,
    pathname: `/categories/${slug}`,
    includeMarkdownAlternate: true,
  });
  const canonicalUrl = alternates.canonical;

  return {
    title,
    description,
    alternates,
    openGraph: {
      title,
      description,
      url: canonicalUrl,
      siteName: getSiteName(currentLocale),
      locale: getOgLocale(currentLocale),
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
    },
  };
}

export default async function CategoryPage({ params }: Props) {
  const { slug, locale } = await params;
  const currentLocale = normalizeLocale(locale);
  const category = await getCategory(slug, currentLocale);

  if (!category) {
    notFound();
  }

  const label = currentLocale === 'ko' ? category.labelKo : category.labelEn;
  const canonicalUrl = absolutePublicUrl(currentLocale, `/categories/${slug}`);
  const pageTitle = currentLocale === 'ko' ? `${label} 카테고리 - 다른` : `${label} Category - Darun`;
  const description =
    currentLocale === 'ko'
      ? `${label} 서비스들의 특징과 대안을 확인해보세요.`
      : `Explore ${label} software, tools, and alternatives on Darun.`;

  const breadcrumbList = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      {
        '@type': 'ListItem',
        position: 1,
        name: currentLocale === 'en' ? 'Home' : '홈',
        item: absolutePublicUrl(currentLocale, '/'),
      },
      {
        '@type': 'ListItem',
        position: 2,
        name: label,
        item: canonicalUrl,
      },
    ],
  };

  const collectionPageJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: pageTitle,
    description,
    url: canonicalUrl,
  };

  return (
    <Layout>
      <JsonLd data={breadcrumbList} />
      <JsonLd data={collectionPageJsonLd} />
      <main className="flex min-h-[calc(100vh-4rem)] w-full flex-col bg-gradient-to-b from-surface-50/60 via-white to-white">
        <CategoryProductSection slug={slug} />
      </main>
    </Layout>
  );
}

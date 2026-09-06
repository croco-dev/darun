import { gql } from '@apollo/client';
import { CategoryProductSection } from '@darun/products-shell';
import { Layout } from '@darun/ui-layout';
import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { cache } from 'react';
import { NO_INDEX_ROBOTS } from '../../../../lib/seo/indexability';
import { getOgLocale } from '../../../../lib/seo/metadata';
import { buildAlternates, normalizeLocale } from '../../../../lib/seo/url';
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
      siteName: '다른(darun)',
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
  const category = await getCategory(slug, locale);

  if (!category) {
    notFound();
  }

  return (
    <Layout>
      <main>
        <CategoryProductSection slug={slug} />
      </main>
    </Layout>
  );
}

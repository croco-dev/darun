import { CategoryProductSection } from '@darun/products-shell';
import { Layout } from '@darun/ui-layout';
import { gql } from '@apollo/client';
import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { cache } from 'react';
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
  const category = await getCategory(slug, locale);

  if (!category) {
    return {
      title: '카테고리 - 다른',
      description: '서비스 카테고리입니다.',
    };
  }

  const label = locale === 'ko' ? category.labelKo : category.labelEn;
  const title = `${label} 카테고리 - 다른`;
  const description = `${label} 서비스들을 모아놓은 카테고리입니다.`;

  return {
    title,
    description,
    openGraph: {
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
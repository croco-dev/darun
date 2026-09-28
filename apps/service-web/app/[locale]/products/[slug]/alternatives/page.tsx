import { gql } from '@apollo/client';
import { ProductAlternativePage } from '@darun/pages-shell';
import { notFound } from '@darun/utils-router';
import { Metadata } from 'next';
import { cache } from 'react';
import { NO_INDEX_ROBOTS } from '../../../../../lib/seo/indexability';
import { JsonLd } from '../../../../../lib/seo/json-ld';
import { getOgLocale, getSiteName } from '../../../../../lib/seo/metadata';
import { absolutePublicUrl, buildAlternates, normalizeLocale } from '../../../../../lib/seo/url';
import { getClient } from '../../../../getServerClient';

const productQuery = gql`
  query ProductBySlugOnProductAlternativePageMetadata($slug: String!, $locale: String!) {
    productBySlug(slug: $slug, locale: $locale) {
      name
      summary
      logoUrl
      tags {
        name
      }
      alternatives {
        name
        tags {
          name
        }
      }
    }
  }
`;

type ProductQueryData = {
  productBySlug?: {
    name: string;
    summary?: string;
    logoUrl?: string;
    tags: { name: string }[];
    alternatives?: { name: string; tags: { name: string }[] }[];
  };
};

type Props = {
  params: Promise<{ locale: string; slug: string }>;
};

const getProduct = cache(async (slug: string, locale: string) => {
  const { data } = await getClient().query<ProductQueryData>({
    query: productQuery,
    variables: { slug, locale },
  });
  return data;
});

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const resolvedParams = await params;
  const currentLocale = normalizeLocale(resolvedParams.locale);

  const data = await getProduct(resolvedParams.slug, currentLocale);

  if (!data?.productBySlug?.name) {
    return notFound();
  }

  const { name, summary, logoUrl } = data.productBySlug;
  const alternatives = data.productBySlug.alternatives ?? [];
  const hasAlternatives = alternatives.length > 0;

  const titleSuffix = currentLocale === 'en' ? 'Darun: Compare Services in One Place' : '다른: 서비스 비교를 한 곳에서';
  const pageTitle =
    currentLocale === 'en' ? `${name} Alternatives - ${titleSuffix}` : `${name}의 다른 서비스 - ${titleSuffix}`;
  const description =
    currentLocale === 'en'
      ? `Explore alternative and similar services to ${name} on Darun.`
      : `${name}의 다른 서비스를 찾아보세요. 다른(darun)에서는 ${name}과 비슷한 다양한 서비스들을 비교하고 정보를 찾아볼 수 있습니다.`;

  const alternates = buildAlternates({
    locale: currentLocale,
    pathname: `/products/${encodeURIComponent(resolvedParams.slug)}/alternatives`,
    includeMarkdownAlternate: true,
  });
  const canonicalUrl = alternates.canonical;
  const ogImageUrl = createOgImageUrl({ name, summary, logoUrl });

  return {
    title: pageTitle,
    description,
    alternates,
    robots: hasAlternatives ? undefined : NO_INDEX_ROBOTS,
    openGraph: {
      title: pageTitle,
      description,
      url: canonicalUrl,
      siteName: getSiteName(currentLocale),
      locale: getOgLocale(currentLocale),
      images: [
        {
          url: ogImageUrl,
          width: 1200,
          height: 630,
          alt: description,
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title: pageTitle,
      description,
      images: [ogImageUrl],
    },
  };
}

const createOgImageUrl = ({ name, summary, logoUrl }: { name: string; summary?: string; logoUrl?: string }) => {
  const url = new URL('https://darun-image.doda.dev/');
  url.searchParams.set('format', 'png');
  url.searchParams.set('type', 'service');
  url.searchParams.set('name', name);
  if (summary) url.searchParams.set('desc', summary);
  if (logoUrl) url.searchParams.set('logo', logoUrl);
  return url.toString();
};

export default async function ProductAlternativePageWrapper({ params }: Props) {
  const resolvedParams = await params;
  const currentLocale = normalizeLocale(resolvedParams.locale);

  const data = await getProduct(resolvedParams.slug, currentLocale);

  if (!data?.productBySlug?.name) {
    notFound();
  }

  const productName = data.productBySlug.name;

  const breadcrumbJsonLd = {
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
        name: productName,
        item: absolutePublicUrl(currentLocale, `/products/${encodeURIComponent(resolvedParams.slug)}`),
      },
      {
        '@type': 'ListItem',
        position: 3,
        name: currentLocale === 'en' ? 'Alternatives' : '다른 서비스',
        item: absolutePublicUrl(currentLocale, `/products/${encodeURIComponent(resolvedParams.slug)}/alternatives`),
      },
    ],
  };

  const isKo = currentLocale === 'ko';
  const faqItems = [
    {
      question: isKo
        ? `${productName}의 대안 서비스는 어떤 기준으로 선정되나요?`
        : `How are alternatives to ${productName} selected?`,
      answer: isKo
        ? `${productName}과 유사한 핵심 기능, 대상 사용자층, 그리고 카테고리 태그 및 커뮤니티 추천 데이터를 바탕으로 엄선하여 비교 목록을 구성합니다.`
        : `Alternatives are curated based on shared core capabilities, target workflows, category tags, and community usage feedback to help you find the best fit.`,
    },
    {
      question: isKo
        ? `선택한 대안 서비스의 최신 정보와 요금제는 어떻게 확인하나요?`
        : `How can I verify pricing and feature details for these alternatives?`,
      answer: isKo
        ? `각 서비스 카드의 공식 웹사이트 링크를 통해 기능 업데이트 내역과 최신 요금 정책을 직접 확인하실 수 있습니다.`
        : `Use the official website link provided on each product card to review the latest specs, integrations, and pricing plans directly from the source.`,
    },
  ];

  return (
    <>
      <JsonLd data={breadcrumbJsonLd} />
      <ProductAlternativePage params={resolvedParams} productName={productName} faqItems={faqItems} />
    </>
  );
}

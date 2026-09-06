import { gql } from '@apollo/client';
import { ProductAlternativePage } from '@darun/pages-shell';
import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { cache } from 'react';
import { NO_INDEX_ROBOTS } from '../../../../../lib/seo/indexability';
import { JsonLd } from '../../../../../lib/seo/json-ld';
import { getOgLocale } from '../../../../../lib/seo/metadata';
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
    pathname: `/products/${resolvedParams.slug}/alternatives`,
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
      siteName: '다른(darun)',
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
        item: absolutePublicUrl(currentLocale, `/products/${resolvedParams.slug}`),
      },
      {
        '@type': 'ListItem',
        position: 3,
        name: currentLocale === 'en' ? 'Alternatives' : '다른 서비스',
        item: absolutePublicUrl(currentLocale, `/products/${resolvedParams.slug}/alternatives`),
      },
    ],
  };

  return (
    <>
      <JsonLd data={breadcrumbJsonLd} />
      <ProductAlternativePage params={resolvedParams} productName={productName} />
    </>
  );
}

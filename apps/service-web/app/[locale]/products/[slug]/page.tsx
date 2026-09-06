import { gql } from '@apollo/client';
import { ProductDetailPage } from '@darun/pages-shell';
import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { cache } from 'react';
import { JsonLd } from '../../../../lib/seo/json-ld';
import { getOgLocale } from '../../../../lib/seo/metadata';
import { absolutePublicUrl, buildAlternates, normalizeLocale } from '../../../../lib/seo/url';
import { getClient } from '../../../getServerClient';

const productQuery = gql`
  query ProductBySlugOnProductDetailPageMetadata($slug: String!, $locale: String!) {
    productBySlug(slug: $slug, locale: $locale) {
      name
      summary
      logoUrl
      description
      tags {
        name
      }
      ownedCompany {
        name
      }
    }
  }
`;

type Props = {
  params: Promise<{ locale: string; slug: string }>;
};

type ProductBySlugData = {
  productBySlug?: {
    name: string;
    summary?: string;
    logoUrl?: string;
    description?: string;
    tags: { name: string }[];
    ownedCompany?: { name: string };
  };
};

const getProductBySlug = cache(async ({ slug, locale }: Awaited<Props['params']>) => {
  const { data } = await getClient().query<ProductBySlugData>({
    query: productQuery,
    variables: { slug, locale },
  });

  return data?.productBySlug;
});

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const resolvedParams = await params;
  const currentLocale = normalizeLocale(resolvedParams.locale);

  const product = await getProductBySlug({
    slug: resolvedParams.slug,
    locale: currentLocale,
  });

  if (!product?.name) {
    return notFound();
  }

  const name = product.name;
  const summary = product.summary;
  const logoUrl = product.logoUrl;

  const titleSuffix = currentLocale === 'en' ? 'Darun: Compare Services in One Place' : '다른: 서비스 비교를 한 곳에서';
  const pageTitle = `${name} - ${titleSuffix}`;
  const defaultDesc =
    currentLocale === 'en'
      ? `Discover features, company info, and alternatives for ${name} on Darun.`
      : `${name}의 주요 기능, 회사 정보, 대안 서비스를 다른(darun)에서 확인해보세요.`;
  const description = summary || defaultDesc;

  const alternates = buildAlternates({
    locale: currentLocale,
    pathname: `/products/${resolvedParams.slug}`,
    includeMarkdownAlternate: true,
  });
  const canonicalUrl = alternates.canonical;
  const ogImageUrl = createOgImageUrl({ name, summary, logoUrl });

  return {
    title: pageTitle,
    description,
    alternates,
    openGraph: {
      title: pageTitle,
      description,
      url: canonicalUrl,
      siteName: '다른(darun)',
      type: 'website',
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

async function ProductDetailPageWithJsonLd({ params }: Props) {
  const resolvedParams = await params;
  const currentLocale = normalizeLocale(resolvedParams.locale);

  const product = await getProductBySlug({
    slug: resolvedParams.slug,
    locale: currentLocale,
  });

  if (!product?.name) {
    return notFound();
  }

  const canonicalUrl = absolutePublicUrl(currentLocale, `/products/${resolvedParams.slug}`);
  const titleSuffix = currentLocale === 'en' ? 'Darun: Compare Services in One Place' : '다른: 서비스 비교를 한 곳에서';
  const pageTitle = `${product.name} - ${titleSuffix}`;

  const webPageJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'ItemPage',
    name: pageTitle,
    description: product.summary || product.description || '',
    url: canonicalUrl,
    ...(product.logoUrl && { image: product.logoUrl }),
    ...(product.ownedCompany && {
      author: {
        '@type': 'Organization',
        name: product.ownedCompany.name,
      },
    }),
  };

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
        name: product.name,
        item: canonicalUrl,
      },
    ],
  };

  return (
    <>
      <JsonLd data={webPageJsonLd} />
      <JsonLd data={breadcrumbList} />
      <ProductDetailPage params={resolvedParams} />
    </>
  );
}

export default ProductDetailPageWithJsonLd;

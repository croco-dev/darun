import { gql } from '@apollo/client';
import { ProductDetailPage } from '@darun/frontend';
import { getClient } from '@darun/utils-apollo-client/server';
import { Metadata } from 'next';
import { notFound } from 'next/navigation';

const productQuery = gql`
  query ProductBySlugOnProductDetailPageMetadata($slug: String!) {
    productBySlug(slug: $slug) {
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
  params: { slug: string };
  searchParams: { [key: string]: string | string[] | undefined };
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { data } = await getClient().query<{
    productBySlug?: {
      name: string;
      summary?: string;
      logoUrl?: string;
      description?: string;
      tags: { name: string }[];
      ownedCompany?: { name: string };
    };
  }>({
    query: productQuery,
    variables: { slug: params.slug },
  });

  if (!data.productBySlug?.name) {
    return notFound();
  }

  const name = data.productBySlug.name;
  const summary = data.productBySlug.summary;
  const logoUrl = data.productBySlug.logoUrl;
  const description = data.productBySlug.description;
  const companyName = data.productBySlug.ownedCompany?.name;

  const tags = data.productBySlug.tags.map(tag => tag.name);

  const pageTitle = `${name} - 다른: 서비스 비교를 한 곳에서`;
  const description = summary || '다른 팀이 손수 비교한 서비스들을 찾고, 쓰고, 평가합니다';
  const canonicalUrl = `https://www.darun.io/products/${params.slug}`;
  const ogImageUrl = createOgImageUrl({ name, summary, logoUrl });

  return {
    title: pageTitle,
    description,
    keywords: [
      `${name} 비슷한 서비스`,
      `${name} 장단점`,
      `${name} 장점`,
      `${name} 단점`,
      `${name} 비교`,
      `${name} 다른 서비스`,
      `${name} 말고 다른 사이트`,
      `${name} 다른 앱`,
      `${name} 대안`,
      `${name} 비슷한 사이트`,
      `${name} 비슷한 앱`,
      `${name} 비슷한`,
      `${name} 말고`,
      ...tags,
      ...tags.map(tag => `${tag} 비슷한`),
    ],
    alternates: {
      canonical: canonicalUrl,
    },
    openGraph: {
      title: pageTitle,
      description,
      url: canonicalUrl,
      siteName: '다른(darun)',
      type: 'website',
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
  const { data } = await getClient().query<{
    productBySlug?: {
      name: string;
      summary?: string;
      logoUrl?: string;
      description?: string;
      tags: { name: string }[];
      ownedCompany?: { name: string };
    };
  }>({
    query: productQuery,
    variables: { slug: params.slug },
  });

  const product = data.productBySlug;

  const jsonLd = product
    ? {
        '@context': 'https://schema.org',
        '@type': 'SoftwareApplication',
        name: product.name,
        description: product.description || product.summary || '',
        image: product.logoUrl || '',
        url: `https://www.darun.io/products/${params.slug}`,
        applicationCategory: 'WebApplication',
        ...(product.ownedCompany && {
          author: {
            '@type': 'Organization',
            name: product.ownedCompany.name,
          },
        }),
        aggregateRating: {
          '@type': 'AggregateRating',
          ratingValue: '4.5',
          reviewCount: '1',
        },
      }
    : null;

  return (
    <>
      {jsonLd && <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />}
      <ProductDetailPage params={params} />
    </>
  );
}

export default ProductDetailPageWithJsonLd;

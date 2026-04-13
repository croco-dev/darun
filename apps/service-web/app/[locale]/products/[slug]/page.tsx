import { gql } from '@apollo/client';
import { ProductDetailPage } from '@darun/pages-shell';
import { Metadata } from 'next';
import { notFound } from 'next/navigation';
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

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const resolvedParams = await params;

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
    variables: { slug: resolvedParams.slug, locale: resolvedParams.locale },
  });

  if (!data.productBySlug?.name) {
    return notFound();
  }

  const name = data.productBySlug.name;
  const summary = data.productBySlug.summary;
  const logoUrl = data.productBySlug.logoUrl;

  const tags = data.productBySlug.tags.map(tag => tag.name);

  const pageTitle = `${name} - 다른: 서비스 비교를 한 곳에서`;
  const description = summary || '다른 팀이 손수 비교한 서비스들을 찾고, 쓰고, 평가합니다';
  const canonicalUrl = `https://www.darun.io/products/${resolvedParams.slug}`;
  const ogImageUrl = createOgImageUrl({ name, summary, logoUrl });

  return {
    title: pageTitle,
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
  const resolvedParams = await params;

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
    variables: { slug: resolvedParams.slug, locale: resolvedParams.locale },
  });

  const product = data.productBySlug;

  const jsonLd = product
    ? {
        '@context': 'https://schema.org',
        '@type': 'SoftwareApplication',
        name: product.name,
        description: product.description || product.summary || '',
        image: product.logoUrl || '',
        url: `https://www.darun.io/products/${resolvedParams.slug}`,
        applicationCategory: 'WebApplication',
        ...(product.ownedCompany && {
          author: {
            '@type': 'Organization',
            name: product.ownedCompany.name,
          },
        }),
      }
    : null;

  const breadcrumbList = product
    ? {
        '@context': 'https://schema.org',
        '@type': 'BreadcrumbList',
        itemListElement: [
          {
            '@type': 'ListItem',
            position: 1,
            name: '홈',
            item: 'https://www.darun.io/',
          },
          {
            '@type': 'ListItem',
            position: 2,
            name: product.name,
          },
        ],
      }
    : null;

  const allJsonLd = [jsonLd, breadcrumbList].filter((value): value is NonNullable<typeof value> => value !== null);

  return (
    <>
      {allJsonLd.map(ld => (
        <script key={`${ld['@type']}-${resolvedParams.slug}`} type="application/ld+json">
          {JSON.stringify(ld).replace(/</g, '\\u003c')}
        </script>
      ))}
      <ProductDetailPage params={resolvedParams} />
    </>
  );
}

export default ProductDetailPageWithJsonLd;

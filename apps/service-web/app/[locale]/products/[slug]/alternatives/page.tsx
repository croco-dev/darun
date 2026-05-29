import { gql } from '@apollo/client';
import { ProductAlternativePage } from '@darun/pages-shell';
import { Metadata } from 'next';
import { cache } from 'react';
import { notFound } from 'next/navigation';
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

  const data = await getProduct(resolvedParams.slug, resolvedParams.locale);

  if (!data?.productBySlug?.name) {
    return notFound();
  }

  const { name, summary, logoUrl, tags: productTags } = data.productBySlug;
  const tags = productTags.map(tag => tag.name);

  const description = `${name}의 다른 서비스를 찾아보세요. 다른(darun)에서는 ${name}과 비슷한 다양한 서비스들을 비교하고, 사용자들이 평가한 서비스들을 찾아볼 수 있습니다.`;
  const pageTitle = `${name}의 다른 서비스 - 다른: 서비스 비교를 한 곳에서`;
  const canonicalUrl = `https://www.darun.io/products/${resolvedParams.slug}/alternatives`;

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

  const data = await getProduct(resolvedParams.slug, resolvedParams.locale);

  if (!data?.productBySlug?.name) {
    notFound();
  }

  const productName = data.productBySlug.name;
  const alternatives = data.productBySlug.alternatives ?? [];
  const altNames = alternatives.map(a => a.name);
  const altCount = alternatives.length;
  const altPreview = altNames.slice(0, 5).join(', ');
  const altTags = [...new Set(alternatives.flatMap(a => a.tags.map(t => t.name)))];
  const altTagPreview = altTags.slice(0, 3).join(', ');
  const breadcrumbJsonLd = {
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
        name: productName,
        item: `https://www.darun.io/products/${resolvedParams.slug}`,
      },
      {
        '@type': 'ListItem',
        position: 3,
        name: '다른 서비스',
      },
    ],
  };
  return (
    <>
      <script type="application/ld+json">{JSON.stringify(breadcrumbJsonLd).replace(/</g, '\\u003c')}</script>
      <ProductAlternativePage params={resolvedParams} />
    </>
  );
}

import { gql } from '@apollo/client';
import { ProductAlternativePage } from '@darun/frontend';
import { getClient } from '@darun/utils-apollo-client/server';
import { Metadata } from 'next';
import { notFound } from 'next/navigation';

const productQuery = gql`
  query ProductBySlugOnProductAlternativePageMetadata($slug: String!) {
    productBySlug(slug: $slug) {
      name
      summary
      logoUrl
      tags {
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
      tags: { name: string }[];
    };
  }>({
    query: productQuery,
    variables: { slug: params.slug },
  });

  if (!data.productBySlug?.name) {
    return notFound();
  }

  const { name, summary, logoUrl } = data.productBySlug;
  const tags = data.productBySlug.tags.map(tag => tag.name);

  const description = `${name}의 다른 서비스를 찾아보세요. 다른(darun)에서는 ${name}과 비슷한 다양한 서비스들을 비교하고, 사용자들이 평가한 서비스들을 찾아볼 수 있습니다.`;
  const pageTitle = `${name}의 다른 서비스 - 다른: 서비스 비교를 한 곳에서`;
  const canonicalUrl = `https://www.darun.io/products/${params.slug}/alternatives`;

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

export default async function ProductAlternativePageWrapper({ params }: { params: { slug: string } }) {
  const { data } = await getClient().query<{
    productBySlug?: {
      name: string;
    };
  }>({
    query: productQuery,
    variables: { slug: params.slug },
  });

  if (!data.productBySlug?.name) {
    notFound();
  }

  const productName = data.productBySlug.name;

  const faqItems = [
    {
      question: `${productName} 대신 사용할 수 있는 서비스는?`,
      answer: `다른(darun)에서는 ${productName}과(와) 비슷한 다양한 대안 서비스를 제공하고 있습니다. 사용자들의 리뷰와 평점을 바탕으로 가장 적합한 서비스를 찾아보세요.`,
    },
    {
      question: `${productName}과(와) 비슷한 무료 서비스는?`,
      answer: `${productName}의 대안으로 사용할 수 있는 무료 서비스들도 존재합니다. 각 서비스의 가격 정책을 확인하여 무료로 제공되는 기능을 비교해보세요.`,
    },
    {
      question: `${productName}의 주요 경쟁사는 어디인가요?`,
      answer: `${productName}의 주요 경쟁사로는 다양한 글로벌 및 국내 서비스들이 있습니다. 기능, 가격, 사용자 경험 등 다양한 측면에서 비교해보고 선택하세요.`,
    },
  ];

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
        item: `https://www.darun.io/products/${params.slug}`,
      },
      {
        '@type': 'ListItem',
        position: 3,
        name: '다른 서비스',
      },
    ],
  };

  const faqJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faqItems.map(item => ({
      '@type': 'Question',
      name: item.question,
      acceptedAnswer: {
        '@type': 'Answer',
        text: item.answer,
      },
    })),
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }} />
      <ProductAlternativePage params={params} faqItems={faqItems} />
    </>
  );
}

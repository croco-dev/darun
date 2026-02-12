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
      alternatives {
        name
        tags {
          name
        }
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
      alternatives?: { name: string; tags: { name: string }[] }[];
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
      alternatives: { name: string; tags: { name: string }[] }[];
    };
  }>({
    query: productQuery,
    variables: { slug: params.slug },
  });

  if (!data.productBySlug?.name) {
    notFound();
  }

  const productName = data.productBySlug.name;
  const alternatives = data.productBySlug.alternatives ?? [];
  const altNames = alternatives.map(a => a.name);
  const altCount = alternatives.length;
  const altPreview = altNames.slice(0, 5).join(', ');
  const altTags = [...new Set(alternatives.flatMap(a => a.tags.map(t => t.name)))];
  const altTagPreview = altTags.slice(0, 3).join(', ');

  const faqItems =
    altCount > 0
      ? [
          {
            question: `${productName} 대신 사용할 수 있는 서비스는?`,
            answer: `${productName}의 대안으로 ${altPreview} 등 총 ${altCount}개의 서비스가 있습니다. 다른(darun)에서 각 서비스의 기능과 사용자 평가를 비교해보세요.`,
          },
          {
            question: `${productName}과(와) 비슷한 서비스를 어떻게 찾나요?`,
            answer: `다른(darun)에서 ${productName}과(와) 유사한 ${altCount}개의 서비스를 확인할 수 있습니다.${altTagPreview ? ` ${altTagPreview} 등의 카테고리에서 비교하고, 사용자 리뷰를 참고해 나에게 맞는 서비스를 선택해보세요.` : ' 사용자 리뷰를 참고해 나에게 맞는 서비스를 선택해보세요.'}`,
          },
          {
            question: `${productName}의 주요 경쟁 서비스는?`,
            answer: `${productName}의 주요 대안 서비스로는 ${altPreview}${altCount > 5 ? ` 외 ${altCount - 5}개` : ''}가 있습니다. 각 서비스의 기능, 장단점, 사용자 평가를 다른(darun)에서 한눈에 비교해보세요.`,
          },
        ]
      : [
          {
            question: `${productName} 대신 사용할 수 있는 서비스는?`,
            answer: `${productName}의 대안 서비스를 다른(darun)에서 찾아보세요. 새로운 대안 서비스가 지속적으로 추가되고 있습니다.`,
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

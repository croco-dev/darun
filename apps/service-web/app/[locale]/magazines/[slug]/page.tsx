import { gql } from '@apollo/client';
import { MagazineContentPage } from '@darun/frontend';
import { getClient } from '@darun/utils-apollo-client/server';
import { Metadata } from 'next';
import { notFound } from 'next/navigation';

const magazineQuery = gql`
  query MagazineBySlugOnMagazinePageMetadata($slug: String!, $locale: String!) {
    magazineBySlug(slug: $slug, locale: $locale) {
      title
      summary
      backgroundImageUrl
      publishedAt
      updatedAt
      author {
        name
      }
    }
  }
`;

type Props = {
  params: { locale: string; slug: string };
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { data } = await getClient().query<{
    magazineBySlug?: {
      title: string;
      summary?: string;
      backgroundImageUrl?: string;
      publishedAt?: string;
      updatedAt?: string;
      author?: {
        name: string;
      };
    };
  }>({
    query: magazineQuery,
    variables: { slug: params.slug, locale: params.locale },
  });

  if (!data.magazineBySlug?.title) {
    return notFound();
  }

  const { title, summary, backgroundImageUrl, author } = data.magazineBySlug;
  const description = summary || '다른 팀이 손수 비교한 서비스들을 찾고, 쓰고, 평가합니다';

  return {
    title: `${title} - 다른: 서비스 비교를 한 곳에서`,
    description,
    keywords: ['서비스 비교', '비교 매거진', '서비스 리뷰', '다른', 'darun'],
    openGraph: {
      title: `${title} - 다른`,
      description,
      siteName: '다른(darun)',
      url: `https://www.darun.io/magazines/${params.slug}`,
      type: 'article',
      images: backgroundImageUrl
        ? [
            {
              url: backgroundImageUrl,
              width: 1200,
              height: 630,
              alt: title,
            },
          ]
        : undefined,
    },
    twitter: {
      card: 'summary_large_image',
      title: `${title} - 다른`,
      description,
      images: backgroundImageUrl ? [backgroundImageUrl] : undefined,
    },
    authors: author ? [{ name: author.name }] : undefined,
  };
}

async function MagazineContentPageWithJsonLd({ params }: Props) {
  const { data } = await getClient().query<{
    magazineBySlug?: {
      title: string;
      summary?: string;
      backgroundImageUrl?: string;
      publishedAt?: string;
      updatedAt?: string;
      author?: {
        name: string;
      };
    };
  }>({
    query: magazineQuery,
    variables: { slug: params.slug, locale: params.locale },
  });

  const magazine = data.magazineBySlug;

  const jsonLd = magazine
    ? {
        '@context': 'https://schema.org',
        '@type': 'Article',
        headline: magazine.title,
        description: magazine.summary || '',
        image: magazine.backgroundImageUrl || '',
        datePublished: magazine.publishedAt,
        dateModified: magazine.updatedAt || magazine.publishedAt,
        ...(magazine.author && {
          author: {
            '@type': 'Person',
            name: magazine.author.name,
          },
        }),
        publisher: {
          '@type': 'Organization',
          name: '다른',
          logo: {
            '@type': 'ImageObject',
            url: 'https://www.darun.io/images/favicon.svg',
          },
        },
      }
    : null;

  const breadcrumbList = magazine
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
            name: '매거진',
          },
          {
            '@type': 'ListItem',
            position: 3,
            name: magazine.title,
          },
        ],
      }
    : null;

  const allJsonLd = [jsonLd, breadcrumbList].filter(Boolean);

  return (
    <>
      {allJsonLd.map((ld, index) => (
        <script key={index} type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(ld) }} />
      ))}
      <MagazineContentPage params={params} />
    </>
  );
}

export default MagazineContentPageWithJsonLd;

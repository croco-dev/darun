import { gql } from '@apollo/client';
import { MagazineContentPage } from '@darun/pages-shell';
import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { cache } from 'react';
import { NO_INDEX_ROBOTS } from '../../../../lib/seo/indexability';
import { JsonLd } from '../../../../lib/seo/json-ld';
import { absolutePublicUrl, normalizeLocale } from '../../../../lib/seo/url';
import { getClient } from '../../../getServerClient';

const magazineQuery = gql`
  query MagazineBySlugOnMagazinePageMetadata($slug: String!) {
    magazineBySlug(slug: $slug) {
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

type MagazineQueryData = {
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
};

type Props = {
  params: Promise<{ locale: string; slug: string }>;
};

const getMagazine = cache(async (slug: string, locale: string) => {
  const { data } = await getClient().query<MagazineQueryData>({
    query: magazineQuery,
    variables: { slug },
  });
  return data;
});

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const resolvedParams = await params;
  const currentLocale = normalizeLocale(resolvedParams.locale);
  const isEn = currentLocale === 'en';

  const data = await getMagazine(resolvedParams.slug, currentLocale);

  if (!data?.magazineBySlug?.title) {
    return notFound();
  }

  const { title, summary, backgroundImageUrl, author } = data.magazineBySlug;
  const description = summary || '다양한 서비스의 비교와 분석 매거진입니다.';
  const canonicalUrl = absolutePublicUrl('ko', `/magazines/${resolvedParams.slug}`);

  return {
    title: `${title} - 다른: 서비스 비교를 한 곳에서`,
    description,
    alternates: {
      canonical: canonicalUrl,
      // Note: magazine is ko-only content; en hreflang alternate is intentionally omitted
    },
    robots: isEn ? NO_INDEX_ROBOTS : undefined,
    openGraph: {
      title: `${title} - 다른`,
      description,
      siteName: '다른(darun)',
      url: canonicalUrl,
      type: 'article',
      locale: 'ko_KR',
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
  const resolvedParams = await params;
  const currentLocale = normalizeLocale(resolvedParams.locale);

  const data = await getMagazine(resolvedParams.slug, currentLocale);
  const magazine = data?.magazineBySlug;

  const canonicalUrl = absolutePublicUrl('ko', `/magazines/${resolvedParams.slug}`);

  const articleJsonLd = magazine
    ? {
        '@context': 'https://schema.org',
        '@type': 'Article',
        headline: magazine.title,
        description: magazine.summary || '',
        mainEntityOfPage: canonicalUrl,
        ...(magazine.backgroundImageUrl && { image: magazine.backgroundImageUrl }),
        datePublished: magazine.publishedAt,
        dateModified: magazine.updatedAt || magazine.publishedAt,
        ...(magazine.author && {
          author: {
            '@type': 'Person',
            name: magazine.author.name,
          },
        }),
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
            item: absolutePublicUrl(currentLocale, '/'),
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
            item: canonicalUrl,
          },
        ],
      }
    : null;

  return (
    <>
      {articleJsonLd && <JsonLd data={articleJsonLd} />}
      {breadcrumbList && <JsonLd data={breadcrumbList} />}
      <MagazineContentPage params={resolvedParams} />
    </>
  );
}

export default MagazineContentPageWithJsonLd;

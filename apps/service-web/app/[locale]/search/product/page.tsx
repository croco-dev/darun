import { SearchProductPage } from '@darun/pages-shell';
import type { Metadata } from 'next';

type Props = {
  searchParams?: Promise<{ [key: string]: string | string[] | undefined }>;
};

const QUERY_MAX_LENGTH = 50;
const TITLE_MAX_LENGTH = 60;

function sanitizeQuery(query: string): string {
  let sanitized = query.replace(/<[^>]*>/g, '');
  sanitized = sanitized.replace(/[<>'"&]/g, '');
  if (sanitized.length > QUERY_MAX_LENGTH) {
    sanitized = sanitized.slice(0, QUERY_MAX_LENGTH - 3) + '...';
  }
  return sanitized.trim();
}

export async function generateMetadata({ searchParams }: Props): Promise<Metadata> {
  const resolvedSearchParams = (await searchParams) ?? {};
  const rawQuery = resolvedSearchParams.query;
  const query = typeof rawQuery === 'string' ? rawQuery : Array.isArray(rawQuery) ? rawQuery[0] : undefined;

  if (!query) {
    return {
      title: '서비스 검색 - 다른',
      description: '다른 팀이 손수 비교한 서비스들을 검색해보세요.',
      robots: {
        index: false,
        follow: true,
      },
    };
  }

  const sanitizedQuery = sanitizeQuery(query);

  if (!sanitizedQuery) {
    return {
      title: '서비스 검색 - 다른',
      description: '다른 팀이 손수 비교한 서비스들을 검색해보세요.',
      robots: {
        index: false,
        follow: true,
      },
    };
  }

  const title = `${sanitizedQuery} 검색 결과 - 다른`;
  const description = `${sanitizedQuery}와 관련된 서비스 검색 결과입니다. 다른 팀이 손수 비교한 서비스들을 확인해보세요.`;

  return {
    title: title.slice(0, TITLE_MAX_LENGTH),
    description,
    keywords: [sanitizedQuery, `${sanitizedQuery} 검색`, `${sanitizedQuery} 서비스`, `${sanitizedQuery} 비교`],
    openGraph: {
      title,
      description,
      siteName: '다른(darun)',
      type: 'website',
    },
  };
}

export default async function Page({ searchParams }: Props) {
  const resolvedSearchParams = (await searchParams) ?? {};

  return <SearchProductPage searchParams={resolvedSearchParams} />;
}

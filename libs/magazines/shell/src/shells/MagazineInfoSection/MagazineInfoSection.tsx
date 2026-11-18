'use client';

import { gql } from '@apollo/client';
import { useSuspenseQuery } from '@apollo/client/react';
import { formatDate } from '@darun/ui';
import { notFound } from '@darun/utils-router';
import { useLocale, useTranslations } from 'next-intl';
import { MagazineArticle } from './MagazineArticle';

const MAGAZINE_QUERY = gql`
  query MagazineBySlugOnInfoSection($slug: String!) {
    magazineBySlug(slug: $slug) {
      id
      title
      summary
      content
      backgroundImageUrl
      publishedAt
      author {
        name
      }
    }
  }
`;

type MagazineInfoSectionProps = { slug: string };

export const MagazineInfoSection = ({ slug }: MagazineInfoSectionProps) => {
  const t = useTranslations('Magazine');
  const locale = useLocale();
  const { data } = useSuspenseQuery<{
    magazineBySlug?: {
      id: string;
      title?: string | null;
      summary?: string | null;
      content?: string | null;
      backgroundImageUrl?: string | null;
      publishedAt?: string | null;
      author?: { name?: string | null } | null;
    } | null;
  }>(MAGAZINE_QUERY, {
    variables: { slug },
  });

  const magazine = data?.magazineBySlug;
  if (!magazine) return notFound();

  const title = magazine.title ?? t('info.title');
  return (
    <MagazineArticle
      title={title}
      summary={magazine.summary ?? t('info.summary')}
      body={magazine.content}
      badge={t('info.badge')}
      contentLabel={t('content.label', { title })}
      emptyLabel={t('content.empty')}
      backgroundImageUrl={magazine.backgroundImageUrl}
      publication={{
        authorName: magazine.author?.name,
        formattedDate: formatDate(magazine.publishedAt, '', locale),
        publishedAt: magazine.publishedAt,
      }}
    />
  );
};

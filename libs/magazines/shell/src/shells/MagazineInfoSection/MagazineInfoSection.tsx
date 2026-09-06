'use client';

import { gql } from '@apollo/client';
import { useSuspenseQuery } from '@apollo/client/react';
import Image from 'next/image';
import { useTranslations } from 'next-intl';

const MAGAZINE_QUERY = gql`
  query MagazineBySlugOnInfoSection($slug: String!) {
    magazineBySlug(slug: $slug) {
      id
      title
      summary
      backgroundImageUrl
      publishedAt
      author {
        name
      }
    }
  }
`;

type MagazineInfoSectionProps = { slug: string };

function formatDate(date?: string | Date | null) {
  if (!date) return '';
  const d = typeof date === 'string' ? new Date(date) : date;
  if (Number.isNaN(d.getTime())) return '';
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}.${month}.${day}`;
}

export const MagazineInfoSection = ({ slug }: MagazineInfoSectionProps) => {
  const t = useTranslations('Magazine');
  const { data } = useSuspenseQuery<{
    magazineBySlug?: {
      id: string;
      title?: string | null;
      summary?: string | null;
      backgroundImageUrl?: string | null;
      publishedAt?: string | null;
      author?: { name?: string | null } | null;
    } | null;
  }>(MAGAZINE_QUERY, {
    variables: { slug },
  });

  const magazine = data?.magazineBySlug;

  return (
    <div className="relative overflow-hidden rounded-card-xl py-8 sm:py-12 lg:py-14">
      {magazine?.backgroundImageUrl ? (
        <Image
          className="absolute inset-0 rounded-card-xl object-cover"
          src={magazine.backgroundImageUrl}
          alt={magazine.title ?? 'Magazine background'}
          fill
          sizes="100vw"
          priority
        />
      ) : (
        <div className="absolute inset-0 rounded-card-xl bg-gradient-to-br from-dark-800 to-dark-900" />
      )}
      <div className="absolute inset-0 rounded-card-xl bg-gradient-to-t from-dark-900/80 via-dark-900/60 to-dark-900/40" />
      <div className="relative z-10 flex flex-col gap-5 px-6 sm:px-8 lg:px-12">
        <div className="flex w-fit flex-row items-center rounded-full border border-white/40 bg-white/10 px-3 py-1 backdrop-blur-sm">
          <p className="text-xs font-medium leading-normal tracking-tight text-white/90 sm:text-sm">
            {t('info.badge')}
          </p>
        </div>
        <div className="flex max-w-3xl flex-col gap-3">
          <h1 className="text-2xl font-bold leading-tight tracking-tight text-white sm:text-3xl lg:text-4xl">
            {magazine?.title ?? t('info.title')}
          </h1>
          <p className="text-sm font-normal leading-relaxed tracking-tight text-white/80 sm:text-base">
            {magazine?.summary ?? t('info.summary')}
          </p>
          <p className="text-sm font-medium tracking-tight text-white/70 sm:text-base">
            {formatDate(magazine?.publishedAt)} {magazine?.author?.name ? `∙ ${magazine.author.name}` : ''}
          </p>
        </div>
      </div>
    </div>
  );
};

'use client';

import { gql } from '@apollo/client';
import { useSuspenseQuery } from '@apollo/client/react';
import { BookOpen, Calendar } from '@darun/ui';
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
  const formattedDate = formatDate(magazine?.publishedAt);
  const authorName = magazine?.author?.name;
  const authorInitial = authorName ? authorName.trim().charAt(0).toUpperCase() : null;

  return (
    <div className="relative overflow-hidden rounded-card-xl border border-dark-150 py-8 shadow-card sm:py-12 lg:py-14">
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
      <div className="absolute inset-0 rounded-card-xl bg-gradient-to-t from-dark-950/85 via-dark-900/65 to-dark-900/45 backdrop-blur-[1px]" />
      <div className="relative z-10 flex flex-col gap-5 px-6 sm:px-8 lg:px-12">
        <div className="inline-flex w-fit items-center gap-1.5 rounded-lg border border-white/20 bg-white/15 px-3 py-1 text-xs font-semibold text-white/95 shadow-2xs backdrop-blur-md">
          <BookOpen size={13} className="stroke-[2.25] text-white/90" aria-hidden="true" />
          <span>{t('info.badge')}</span>
        </div>
        <div className="flex max-w-3xl flex-col gap-3">
          <h1 className="text-2xl font-bold leading-tight tracking-tight text-white break-keep sm:text-3xl lg:text-4xl">
            {magazine?.title ?? t('info.title')}
          </h1>
          <p className="text-sm font-normal leading-relaxed tracking-tight text-white/85 break-keep sm:text-base">
            {magazine?.summary ?? t('info.summary')}
          </p>
          <div className="flex flex-wrap items-center gap-3 pt-1 text-xs font-medium text-white/80 sm:text-sm">
            {authorName && (
              <div className="flex items-center gap-1.5">
                {authorInitial && (
                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-white/20 text-2xs font-bold text-white ring-1 ring-white/30">
                    {authorInitial}
                  </span>
                )}
                <span className="font-semibold text-white/95">{authorName}</span>
              </div>
            )}
            {authorName && formattedDate && <span className="text-white/40">∙</span>}
            {formattedDate && (
              <div className="flex items-center gap-1.5 text-white/75">
                <Calendar size={14} className="stroke-[2] text-white/70" aria-hidden="true" />
                <span>{formattedDate}</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

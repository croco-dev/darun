'use client';

import { gql } from '@apollo/client';
import { useSuspenseQuery } from '@apollo/client/react';
import { BookOpen, Calendar, formatDate } from '@darun/ui';
import { notFound } from '@darun/utils-router';
import DOMPurify from 'isomorphic-dompurify';
import Image from 'next/image';
import { useLocale, useTranslations } from 'next-intl';

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

  const content = DOMPurify.sanitize(magazine.content ?? '', {
    USE_PROFILES: { html: true },
  });
  const formattedDate = formatDate(magazine?.publishedAt, '', locale);
  const authorName = magazine?.author?.name;
  const authorInitial = authorName ? authorName.trim().charAt(0).toUpperCase() : null;

  return (
    <>
      <div className="relative overflow-hidden rounded-card-xl border border-white/10 ring-1 ring-black/20 py-8 shadow-card sm:py-12 lg:py-14">
        {magazine?.backgroundImageUrl ? (
          <Image
            className="absolute inset-0 rounded-card-xl object-cover"
            src={magazine.backgroundImageUrl}
            alt=""
            aria-hidden="true"
            fill
            sizes="100vw"
            priority
          />
        ) : (
          <div className="absolute inset-0 rounded-card-xl bg-gradient-to-br from-dark-800 to-dark-900" />
        )}
        <div className="absolute inset-0 rounded-card-xl bg-gradient-to-t from-dark-950/85 via-dark-900/65 to-dark-900/45 backdrop-blur-[1px]" />
        <div className="relative z-10 flex flex-col gap-5 px-6 sm:px-8 lg:px-12">
          <div className="inline-flex w-fit items-center gap-1.5 rounded-full border border-white/20 bg-white/15 px-3 py-1 text-xs font-semibold text-white/95 shadow-2xs backdrop-blur-md">
            <BookOpen size={13} className="shrink-0 stroke-[2.25] text-white/90" aria-hidden="true" />
            <span className="whitespace-nowrap">{t('info.badge')}</span>
          </div>
          <div className="flex max-w-3xl flex-col gap-3">
            <h1 className="text-2xl font-extrabold leading-tight tracking-tight text-white break-words [word-break:keep-all] sm:text-3xl lg:text-4xl">
              {magazine?.title ?? t('info.title')}
            </h1>
            <p className="text-sm font-normal leading-relaxed tracking-tight text-white/85 break-words [word-break:keep-all] sm:text-base">
              {magazine?.summary ?? t('info.summary')}
            </p>
            <div className="flex flex-wrap items-center gap-3 pt-1 text-xs font-medium text-white/80 sm:text-sm">
              {authorName && (
                <div className="flex items-center gap-1.5">
                  {authorInitial && (
                    <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-white/20 text-2xs font-bold text-white ring-1 ring-white/40 backdrop-blur-xs shadow-2xs">
                      {authorInitial}
                    </span>
                  )}
                  <span className="font-semibold text-white/95 whitespace-nowrap">{authorName}</span>
                </div>
              )}
              {authorName && formattedDate && (
                <span aria-hidden="true" className="select-none text-white/40">
                  ∙
                </span>
              )}
              {formattedDate && (
                <div className="flex items-center gap-1.5 text-white/75">
                  <Calendar size={14} className="shrink-0 stroke-[2] text-white/70" aria-hidden="true" />
                  <time className="tabular-nums whitespace-nowrap" dateTime={magazine?.publishedAt ?? undefined}>
                    {formattedDate}
                  </time>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
      <article
        aria-label={t('content.label', {
          title: magazine.title ?? t('info.title'),
        })}
        className="min-w-0 rounded-card-lg border border-dark-150 bg-white p-5 text-dark-700 shadow-card sm:p-6 md:p-8"
      >
        {content.trim() ? (
          <div
            className="min-w-0 max-w-none break-words leading-relaxed [&>*:first-child]:mt-0 [&_h1]:my-6 [&_h1]:text-2xl [&_h1]:font-bold [&_h2]:mt-8 [&_h2]:mb-3 [&_h2]:text-xl [&_h2]:font-bold [&_h3]:mt-6 [&_h3]:mb-2 [&_h3]:text-lg [&_h3]:font-semibold [&_h4]:my-4 [&_h4]:font-semibold [&_p]:my-3 [&_a]:text-dark-900 [&_a]:underline [&_a]:underline-offset-2 [&_ul]:my-3 [&_ul]:list-disc [&_ul]:pl-6 [&_ol]:my-3 [&_ol]:list-decimal [&_ol]:pl-6 [&_li]:my-1 [&_img]:my-5 [&_img]:h-auto [&_img]:max-w-full [&_blockquote]:my-5 [&_blockquote]:border-l-4 [&_blockquote]:border-brown-500 [&_blockquote]:pl-4 [&_pre]:my-5 [&_pre]:overflow-x-auto [&_pre]:rounded-lg [&_pre]:bg-surface-100 [&_pre]:p-4 [&_code]:font-mono [&_table]:my-5 [&_table]:block [&_table]:max-w-full [&_table]:overflow-x-auto [&_table]:border-collapse [&_th]:border [&_th]:border-dark-150 [&_th]:bg-surface-100 [&_th]:px-3 [&_th]:py-2 [&_th]:text-left [&_td]:border [&_td]:border-dark-150 [&_td]:px-3 [&_td]:py-2"
            dangerouslySetInnerHTML={{ __html: content }}
          />
        ) : (
          <p className="py-6 text-center text-sm text-dark-500">{t('content.empty')}</p>
        )}
      </article>
    </>
  );
};

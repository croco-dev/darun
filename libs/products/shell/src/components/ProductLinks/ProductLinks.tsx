'use client';

import { Button, ExternalLink, Globe } from '@darun/ui';
import { Link } from '@darun/utils-router';
import { bind } from '@darun/utils-structure-react';
import Image from 'next/image';
import { useLocale } from 'next-intl';
import { getLocalizedLinkTitle } from '../../utils/localization';
import { useProductLinks } from './useProductLinks';

export const ProductLinks = bind(useProductLinks, ({ links }) => {
  const locale = useLocale();

  if (!links || links.length === 0) {
    return null;
  }

  return (
    <>
      {links.map((link, index) => {
        const isPrimary = index === 0;
        const localizedTitle = getLocalizedLinkTitle(link.title, locale);
        const tooltipTitle = link.displayLink ? `${localizedTitle} (${link.displayLink})` : localizedTitle;
        const normalizedTitle = link.title.trim().toLowerCase();
        const isOfficialWebsite =
          normalizedTitle === '공식 홈페이지' ||
          normalizedTitle === '공식홈페이지' ||
          normalizedTitle === '공식 웹사이트' ||
          normalizedTitle === '공식웹사이트' ||
          normalizedTitle === '홈페이지' ||
          normalizedTitle === '웹사이트' ||
          normalizedTitle === 'official website' ||
          normalizedTitle === 'website' ||
          normalizedTitle === 'home' ||
          normalizedTitle === 'homepage' ||
          getLocalizedLinkTitle(link.title, 'ko').trim() === '공식 홈페이지' ||
          Boolean(link.iconUrl?.includes('pvjgv9btsktstjkoarrl'));

        return (
          <Link
            key={link.id}
            href={link.link}
            target="_blank"
            rel="noopener noreferrer"
            title={tooltipTitle}
            aria-label={`${tooltipTitle} (${locale === 'ko' ? '새 창에서 열림' : 'opens in a new tab'})`}
            className="group inline-flex rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-dark-900/60 focus-visible:ring-offset-2"
          >
            <Button
              as="span"
              variant="shadow"
              color={isPrimary ? 'primary' : 'secondary'}
              size="md"
              className={`h-10 sm:h-11 px-3.5 sm:px-4 transition-all duration-200 active:scale-[0.98] motion-reduce:transform-none motion-reduce:transition-none ${
                isPrimary
                  ? 'border-dark-800 bg-dark-900 text-white shadow-button hover:border-dark-700 hover:bg-dark-800 hover:shadow-button-hover'
                  : 'border-dark-150 bg-white text-dark-800 shadow-button hover:border-dark-300 hover:bg-surface-100 hover:text-dark-950 hover:shadow-button-hover'
              }`}
            >
              <div className="flex items-center justify-center gap-2">
                {isOfficialWebsite ? (
                  <div
                    className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-md ${
                      isPrimary
                        ? 'border border-white/20 bg-white/10 text-white'
                        : 'border border-dark-150/70 bg-surface-100 text-dark-800 shadow-2xs'
                    }`}
                  >
                    <Globe size={13} aria-hidden="true" className="shrink-0 stroke-[2.2] text-current" />
                  </div>
                ) : link.iconUrl ? (
                  <div
                    className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-md p-0.5 shadow-2xs ${
                      isPrimary ? 'border border-white/20 bg-white' : 'border border-dark-150/70 bg-surface-100'
                    }`}
                  >
                    <Image
                      src={link.iconUrl}
                      alt=""
                      aria-hidden="true"
                      width={16}
                      height={16}
                      className="h-full w-full object-contain rounded-sm"
                      unoptimized
                    />
                  </div>
                ) : (
                  <div
                    className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-md ${
                      isPrimary
                        ? 'border border-white/20 bg-white/10 text-white'
                        : 'border border-dark-150/70 bg-surface-100 text-dark-800 shadow-2xs'
                    }`}
                  >
                    <Globe size={13} aria-hidden="true" className="shrink-0 stroke-[2.2] text-current" />
                  </div>
                )}
                <span className="w-max break-keep text-xs sm:text-sm font-semibold text-current">{localizedTitle}</span>
                <ExternalLink
                  size={14}
                  aria-hidden="true"
                  className={`shrink-0 transition-all duration-200 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 motion-reduce:transform-none motion-reduce:transition-none ${
                    isPrimary ? 'text-dark-400 group-hover:text-white' : 'text-dark-400 group-hover:text-dark-900'
                  }`}
                />
              </div>
            </Button>
          </Link>
        );
      })}
    </>
  );
});

'use client';

import { Button, ExternalLink } from '@darun/ui';
import { bind } from '@darun/utils-structure-react';
import Image from 'next/image';
import { Link } from '@darun/utils-router';
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
        return (
          <Link
            key={link.id}
            href={link.link}
            target="_blank"
            rel="noopener noreferrer"
            className="group rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-dark-900/60 focus-visible:ring-offset-2"
          >
            <Button
              as="span"
              variant="shadow"
              color={isPrimary ? 'primary' : 'secondary'}
              size="md"
              className={`min-h-[42px] sm:min-h-[44px] px-3.5 sm:px-4 transition-all duration-200 active:scale-95 ${
                isPrimary
                  ? 'border-dark-800 bg-dark-900 text-white shadow-button hover:border-dark-700 hover:bg-dark-800 hover:shadow-button-hover'
                  : 'border-dark-150 bg-white text-dark-800 shadow-button hover:border-dark-300 hover:bg-surface-100 hover:text-dark-950 hover:shadow-button-hover'
              }`}
            >
              <div className="flex items-center justify-center gap-2">
                {link.iconUrl && (
                  <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md border border-dark-150/70 bg-surface-100 p-0.5 shadow-2xs">
                    <Image
                      src={link.iconUrl}
                      alt={link.title}
                      width={16}
                      height={16}
                      className="h-full w-full object-contain rounded-xs"
                      unoptimized
                    />
                  </div>
                )}
                <div className="flex flex-col items-start leading-tight">
                  <span className="w-max break-keep text-sm font-semibold text-current">
                    {getLocalizedLinkTitle(link.title, locale)}
                  </span>
                  {isPrimary && link.displayLink && (
                    <span className="break-keep text-2xs text-dark-400 transition-colors group-hover:text-dark-300">
                      {link.displayLink}
                    </span>
                  )}
                </div>
                <ExternalLink
                  size={14}
                  className={`shrink-0 transition-all duration-200 ${
                    isPrimary
                      ? 'text-dark-400 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:text-white'
                      : 'text-dark-400 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:text-dark-900'
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

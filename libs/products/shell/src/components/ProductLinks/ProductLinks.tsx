'use client';

import {
  getProductLinkIconSource,
  getProductLinkLabel,
  orderPublicProductLinks,
  productLinkIconNeedsDarkBackground,
} from '@darun/products-feature';
import { Button, ExternalLink, Globe, Link2 } from '@darun/ui';
import { Link } from '@darun/utils-router';
import { bind } from '@darun/utils-structure-react';
import Image from 'next/image';
import { useLocale } from 'next-intl';
import { useState } from 'react';
import { ProductSectionContent } from '../ProductSectionContent';
import { useProductLinks } from './useProductLinks';

type ProductLinkQuery = ReturnType<typeof useProductLinks>;

export const ProductLinks = bind(useProductLinks, ({ links, error, refetch }) => (
  <ProductSectionContent error={error} refetch={refetch}>
    <ProductLinkButtons links={links} />
  </ProductSectionContent>
));

function ProductLinkButtons({ links }: Pick<ProductLinkQuery, 'links'>) {
  const locale = useLocale();

  if (!links || links.length === 0) {
    return null;
  }

  return (
    <>
      {orderPublicProductLinks(links).map(link => {
        const { isPrimary } = link;
        const localizedTitle = getProductLinkLabel(link, locale);
        const tooltipTitle = link.displayLink ? `${localizedTitle} (${link.displayLink})` : localizedTitle;
        const iconSrc = getProductLinkIconSource(link.iconUrl);

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
                <ProductLinkIcon key={iconSrc} link={link} iconSrc={iconSrc} />
                <span className="truncate max-w-[200px] sm:max-w-xs text-xs sm:text-sm font-semibold text-current">
                  {localizedTitle}
                </span>
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
}

type ProductLink = ProductLinkQuery['links'][number];

function ProductLinkIcon({ link, iconSrc }: { link: ProductLink; iconSrc: string | null }) {
  const [failed, setFailed] = useState(false);
  const { isPrimary } = link;

  if (!iconSrc || failed) {
    const FallbackIcon = link.role === 'official' ? Globe : Link2;
    return (
      <div
        className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-md ${
          isPrimary
            ? 'border border-white/20 bg-white/10 text-white'
            : 'border border-dark-150/70 bg-surface-100 text-dark-800 shadow-2xs'
        }`}
      >
        <FallbackIcon size={13} aria-hidden="true" className="shrink-0 stroke-[2.2] text-current" />
      </div>
    );
  }

  return (
    <div
      className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-md p-0.5 shadow-2xs ${
        productLinkIconNeedsDarkBackground(iconSrc)
          ? 'border border-dark-800 bg-dark-900'
          : isPrimary
            ? 'border border-white/20 bg-white'
            : 'border border-dark-150/70 bg-surface-100'
      }`}
    >
      <Image
        src={iconSrc}
        alt=""
        aria-hidden="true"
        referrerPolicy="no-referrer"
        width={16}
        height={16}
        className="h-full w-full object-contain rounded-sm"
        unoptimized
        onError={() => setFailed(true)}
      />
    </div>
  );
}

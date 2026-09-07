'use client';

import { Chip } from '@darun/ui';
import Image from 'next/image';
import { useTranslations } from 'next-intl';
import React from 'react';

type ProductItemProps = {
  as?: 'div' | 'a' | 'button';
  logoUrl?: string;
  logoSize?: keyof typeof logoSizes;
  name: string;
  summary?: string;
  tagVariant?: 'square' | 'circle';
  tags?: string[];
  specialTags?: string[];
  maxTagItems?: number;
  isAlignCenter?: boolean;
  nameAs?: 'h3' | 'h2' | 'h1';
  isSummaryNoWrap?: boolean;
  isStacked?: boolean;
  isHero?: boolean;
  footerRight?: React.ReactNode;
};

const logoSizes = {
  small: { imageSize: 56 },
  medium: { imageSize: 72 },
  large: { imageSize: 96 },
};

export const ProductItem = ({
  as = 'div',
  logoUrl,
  logoSize = 'medium',
  name,
  summary,
  tagVariant = 'square',
  tags,
  specialTags,
  maxTagItems,
  isAlignCenter,
  nameAs = 'h3',
  isSummaryNoWrap = false,
  isStacked = false,
  isHero = false,
  footerRight,
}: ProductItemProps) => {
  const t = useTranslations('ProductDetail');
  const Component = as;
  const NameTag = nameAs;
  const [resolvedLogoUrl, setResolvedLogoUrl] = React.useState(logoUrl);
  const effectiveLogoSize = isHero ? 'large' : logoSize;

  return (
    <Component
      className={
        isStacked
          ? 'flex w-full flex-col gap-3 overflow-visible'
          : `flex w-full gap-3 overflow-visible ${isAlignCenter ? 'items-center' : 'items-start'}`
      }
    >
      <div
        className={`flex shrink-0 items-center justify-center overflow-hidden border border-dark-150/70 bg-white ${
          isHero
            ? 'h-24 w-24 rounded-2xl p-2.5 shadow-card'
            : effectiveLogoSize === 'small'
              ? 'h-12 w-12 rounded-xl p-1.5 shadow-2xs'
              : 'h-16 w-16 rounded-2xl p-2 shadow-xs'
        }`}
      >
        <Image
          src={resolvedLogoUrl ?? '/images/default-product-icon.svg'}
          unoptimized={!resolvedLogoUrl}
          alt={t('productItem.logoAlt', { name })}
          width={logoSizes[effectiveLogoSize].imageSize}
          height={logoSizes[effectiveLogoSize].imageSize}
          className="h-full w-full object-contain rounded-lg"
          onError={() => setResolvedLogoUrl(undefined)}
        />
      </div>
      <div className="flex min-w-0 flex-1 flex-col gap-2 overflow-hidden w-full">
        <div className="flex flex-col gap-0.5">
          <NameTag
            className={
              isHero
                ? 'm-0 text-2xl font-extrabold leading-tight tracking-tightest text-dark-900 md:text-3xl'
                : `m-0 text-base font-bold leading-snug tracking-tight text-dark-900 transition-colors duration-200 group-hover:text-dark-950 ${isStacked ? 'line-clamp-1' : 'md:text-lg'}`
            }
          >
            {name}
          </NameTag>
          {summary &&
            (isStacked ? (
              <p className="line-clamp-2 text-xs md:text-sm leading-relaxed text-dark-600 min-h-[2.5rem]">{summary}</p>
            ) : isSummaryNoWrap && !isHero ? (
              <p className="w-full overflow-hidden text-ellipsis whitespace-nowrap text-sm leading-relaxed text-dark-600">
                {summary}
              </p>
            ) : (
              <p
                className={
                  isHero
                    ? 'text-base leading-relaxed text-dark-600 md:text-lg'
                    : 'text-sm leading-relaxed text-dark-600'
                }
              >
                {summary}
              </p>
            ))}
        </div>
        {(tags || specialTags || footerRight) && (
          <div className="flex items-center justify-between gap-2 pt-1 mt-auto w-full">
            {tags || specialTags ? (
              <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-hide">
                {tags &&
                  (maxTagItems && tags.length > maxTagItems ? (
                    <div className="flex items-center gap-1.5">
                      {tags.slice(0, maxTagItems).map(tag => (
                        <Chip
                          key={`tag-${tag}`}
                          variant={tagVariant}
                          color={tagVariant === 'square' ? 'filledGray' : 'outlineGray'}
                        >
                          {tag}
                        </Chip>
                      ))}
                      <span className="text-2xs font-medium tabular-nums text-dark-500">
                        +{tags.length - maxTagItems}
                      </span>
                    </div>
                  ) : (
                    tags.map(tag => (
                      <Chip
                        key={`tag-${tag}`}
                        variant={tagVariant}
                        color={tagVariant === 'square' ? 'filledGray' : 'outlineGray'}
                      >
                        {tag}
                      </Chip>
                    ))
                  ))}
                {specialTags && (
                  <>
                    <span className="text-dark-400">•</span>
                    {specialTags.map(tag => (
                      <Chip key={`special-tag-${tag}`} variant={tagVariant} color="filledDark">
                        {tag}
                      </Chip>
                    ))}
                  </>
                )}
              </div>
            ) : (
              <div />
            )}
            {footerRight}
          </div>
        )}
      </div>
    </Component>
  );
};

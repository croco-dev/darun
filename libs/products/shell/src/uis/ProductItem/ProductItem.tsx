'use client';

import { Chip } from '@darun/ui';
import Image from 'next/image';
import { useLocale, useTranslations } from 'next-intl';
import React from 'react';
import { getLocalizedTag } from '../../utils/localization';
import { RankBadge } from '../RankBadge';

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
  isRanked?: boolean;
  rank?: number;
  headerRight?: React.ReactNode;
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
  isRanked = false,
  rank,
  headerRight,
  footerRight,
}: ProductItemProps) => {
  const effectiveT = useTranslations('ProductDetail');
  const locale = useLocale();
  const Component = as;
  const NameTag = nameAs;
  const [hasImageError, setHasImageError] = React.useState(false);
  const [prevLogoUrl, setPrevLogoUrl] = React.useState(logoUrl);

  if (prevLogoUrl !== logoUrl) {
    setPrevLogoUrl(logoUrl);
    setHasImageError(false);
  }

  const resolvedLogoUrl = hasImageError ? undefined : logoUrl;
  const effectiveLogoSize = isHero ? 'large' : logoSize;

  if (isRanked) {
    return (
      <Component className="flex w-full flex-col gap-2.5">
        <div className="flex items-center justify-between gap-3">
          <div className="flex min-w-0 flex-1 items-center gap-3">
            {rank !== undefined && <RankBadge rank={rank} size="md" />}
            <div className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-dark-150/90 bg-white p-1 shadow-2xs ring-1 ring-black/5">
              <Image
                src={resolvedLogoUrl ?? '/images/default-product-icon.svg'}
                unoptimized={!resolvedLogoUrl}
                alt={effectiveT('productItem.logoAlt', { name })}
                width={44}
                height={44}
                className="h-full w-full rounded-lg object-contain"
                onError={() => setHasImageError(true)}
              />
            </div>
            <div className="flex min-w-0 flex-1 flex-col justify-center gap-0.5">
              <NameTag className="m-0 truncate text-base font-bold leading-snug tracking-tight text-dark-900 transition-colors duration-200 group-hover:text-dark-950">
                {name}
              </NameTag>
              {tags && tags.length > 0 && (
                <div className="flex items-center gap-1.5 overflow-hidden py-0.5">
                  <Chip color="filledGray" variant="square">
                    {getLocalizedTag(tags[0], locale)}
                  </Chip>
                  {tags.length > 1 && (
                    <Chip color="filledGray" variant="square" className="shrink-0 tabular-nums select-none">
                      +{tags.length - 1}
                    </Chip>
                  )}
                </div>
              )}
            </div>
          </div>
          {headerRight && <div className="shrink-0 pt-0.5">{headerRight}</div>}
        </div>
        {summary && (
          <p className="line-clamp-2 text-xs leading-normal text-dark-600 break-words [word-break:keep-all] sm:text-sm sm:leading-relaxed">
            {summary}
          </p>
        )}
      </Component>
    );
  }

  return (
    <Component
      className={
        isStacked
          ? 'flex w-full flex-col gap-3 overflow-visible'
          : `flex w-full overflow-visible ${isHero ? 'gap-3.5 sm:gap-4 md:gap-5' : 'gap-3'} ${isAlignCenter ? 'items-center' : 'items-start'}`
      }
    >
      <div
        className={`flex shrink-0 items-center justify-center overflow-hidden border border-dark-150 bg-white ring-1 ring-black/5 ${
          isHero
            ? 'h-20 w-20 rounded-2xl p-2 shadow-card sm:h-24 sm:w-24 sm:p-2.5'
            : effectiveLogoSize === 'small'
              ? 'h-12 w-12 rounded-xl p-1.5 shadow-2xs'
              : 'h-16 w-16 rounded-2xl p-2 shadow-xs'
        }`}
      >
        <Image
          src={resolvedLogoUrl ?? '/images/default-product-icon.svg'}
          unoptimized={!resolvedLogoUrl}
          alt={effectiveT('productItem.logoAlt', { name })}
          width={logoSizes[effectiveLogoSize].imageSize}
          height={logoSizes[effectiveLogoSize].imageSize}
          className={`h-full w-full object-contain ${isHero ? 'rounded-xl' : 'rounded-lg'}`}
          onError={() => setHasImageError(true)}
        />
      </div>
      <div className="flex min-w-0 flex-1 flex-col gap-2 overflow-hidden w-full">
        <div className={isHero ? 'flex flex-col gap-1.5 sm:gap-2' : 'flex flex-col gap-0.5'}>
          <NameTag
            className={
              isHero
                ? 'm-0 text-2xl font-extrabold leading-tight tracking-tight text-dark-900 break-words [word-break:keep-all] sm:text-3xl'
                : `m-0 text-base font-bold leading-snug tracking-tight text-dark-900 transition-colors duration-200 group-hover:text-dark-950 break-words [word-break:keep-all] ${isStacked ? 'line-clamp-1' : 'md:text-lg'}`
            }
          >
            {name}
          </NameTag>
          {summary &&
            (isStacked ? (
              <p className="line-clamp-2 text-xs leading-normal text-dark-600 break-words [word-break:keep-all] sm:text-sm sm:leading-relaxed">
                {summary}
              </p>
            ) : isSummaryNoWrap && !isHero ? (
              <p className="w-full overflow-hidden text-ellipsis whitespace-nowrap text-sm leading-relaxed text-dark-600">
                {summary}
              </p>
            ) : (
              <p
                className={
                  isHero
                    ? 'text-sm leading-relaxed text-dark-600 break-words [word-break:keep-all] sm:text-base md:text-lg'
                    : 'line-clamp-2 text-sm leading-relaxed text-dark-600 break-words [word-break:keep-all]'
                }
              >
                {summary}
              </p>
            ))}
        </div>
        {((tags && tags.length > 0) || (specialTags && specialTags.length > 0) || footerRight) && (
          <div className="flex items-center justify-between gap-2 pt-1 mt-auto w-full">
            {(tags && tags.length > 0) || (specialTags && specialTags.length > 0) ? (
              <div className="flex items-center gap-1.5 sm:gap-2 overflow-x-auto scrollbar-hide touch-pan-x py-0.5">
                {tags &&
                  tags.length > 0 &&
                  (maxTagItems && tags.length > maxTagItems ? (
                    <div className="flex items-center gap-1.5">
                      {tags.slice(0, maxTagItems).map(tag => (
                        <Chip
                          key={`tag-${tag}`}
                          variant={tagVariant}
                          color={tagVariant === 'square' ? 'filledGray' : 'outlineGray'}
                        >
                          {getLocalizedTag(tag, locale)}
                        </Chip>
                      ))}
                      <Chip
                        variant={tagVariant}
                        color={tagVariant === 'square' ? 'filledGray' : 'outlineGray'}
                        className="shrink-0 tabular-nums select-none"
                      >
                        +{tags.length - maxTagItems}
                      </Chip>
                    </div>
                  ) : (
                    tags.map(tag => (
                      <Chip
                        key={`tag-${tag}`}
                        variant={tagVariant}
                        color={tagVariant === 'square' ? 'filledGray' : 'outlineGray'}
                      >
                        {getLocalizedTag(tag, locale)}
                      </Chip>
                    ))
                  ))}
                {specialTags && specialTags.length > 0 && (
                  <>
                    {tags && tags.length > 0 && (
                      <span aria-hidden="true" className="select-none text-dark-400">
                        •
                      </span>
                    )}
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

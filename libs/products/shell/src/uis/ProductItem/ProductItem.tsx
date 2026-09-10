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
  const t = useTranslations('ProductDetail');
  const Component = as;
  const NameTag = nameAs;
  const [resolvedLogoUrl, setResolvedLogoUrl] = React.useState(logoUrl);
  const effectiveLogoSize = isHero ? 'large' : logoSize;

  if (isRanked) {
    return (
      <Component className="flex w-full flex-col gap-2.5">
        <div className="flex items-start justify-between gap-3">
          <div className="flex min-w-0 flex-1 items-start gap-3 pt-0.5">
            {rank !== undefined && (
              <span
                className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-sm font-black tabular-nums transition-all duration-200 ${
                  rank === 1
                    ? 'bg-gradient-to-b from-amber-300 via-amber-400 to-amber-500 text-amber-950 shadow-xs ring-1 ring-amber-300/80 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.7)]'
                    : rank === 2
                      ? 'bg-gradient-to-b from-slate-100 via-slate-200 to-slate-300 text-slate-800 shadow-xs ring-1 ring-slate-300/90 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.9)]'
                      : rank === 3
                        ? 'bg-gradient-to-b from-amber-600 via-amber-700 to-orange-800 text-amber-50 shadow-xs ring-1 ring-amber-600/50 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.35)]'
                        : 'border border-dark-150 bg-surface-100 font-bold text-dark-700 group-hover:border-dark-300 group-hover:bg-white group-hover:text-dark-900'
                }`}
              >
                {rank}
              </span>
            )}
            <div className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-dark-150 bg-white p-1 shadow-2xs">
              <Image
                src={resolvedLogoUrl ?? '/images/default-product-icon.svg'}
                unoptimized={!resolvedLogoUrl}
                alt={t('productItem.logoAlt', { name })}
                width={44}
                height={44}
                className="h-full w-full rounded-lg object-contain"
                onError={() => setResolvedLogoUrl(undefined)}
              />
            </div>
            <div className="flex min-w-0 flex-1 flex-col justify-center gap-0.5">
              <NameTag className="m-0 truncate text-base font-bold leading-snug tracking-tight text-dark-900 transition-colors duration-200 group-hover:text-dark-950">
                {name}
              </NameTag>
              {tags && tags.length > 0 && (
                <div className="flex items-center gap-1.5 overflow-hidden">
                  <span className="inline-block truncate rounded-md bg-dark-100/80 px-1.5 py-0.5 text-2xs font-semibold text-dark-600 group-hover:bg-dark-150/70">
                    {tags[0]}
                  </span>
                  {tags.length > 1 && (
                    <span className="shrink-0 rounded-md bg-dark-100/80 px-1.5 py-0.5 text-2xs font-semibold tabular-nums text-dark-500">
                      +{tags.length - 1}
                    </span>
                  )}
                </div>
              )}
            </div>
          </div>
          {headerRight && <div className="shrink-0 pt-0.5">{headerRight}</div>}
        </div>
        {summary && (
          <p className="line-clamp-2 text-xs leading-normal text-dark-600 break-keep sm:text-sm sm:leading-relaxed">
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
          : `flex w-full gap-3 overflow-visible ${isAlignCenter ? 'items-center' : 'items-start'}`
      }
    >
      <div
        className={`flex shrink-0 items-center justify-center overflow-hidden border border-dark-150 bg-white ${
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
                ? 'm-0 text-2xl font-bold leading-tight tracking-tight text-dark-900 md:text-3xl'
                : `m-0 text-base font-bold leading-snug tracking-tight text-dark-900 transition-colors duration-200 group-hover:text-dark-950 ${isStacked ? 'line-clamp-1' : 'md:text-lg'}`
            }
          >
            {name}
          </NameTag>
          {summary &&
            (isStacked ? (
              <p className="line-clamp-2 text-xs leading-normal text-dark-600 break-keep sm:text-sm sm:leading-relaxed">
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
                    ? 'text-base leading-relaxed text-dark-600 break-keep md:text-lg'
                    : 'text-sm leading-relaxed text-dark-600 break-keep'
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

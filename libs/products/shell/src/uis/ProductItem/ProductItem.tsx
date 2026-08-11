'use client';

import { Chip } from '@darun/ui';
import Image from 'next/image';
import { useTranslations } from 'next-intl';

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
};

const logoSizes = {
  small: {
    imageSize: 56,
  },
  medium: {
    imageSize: 72,
  },
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
}: ProductItemProps) => {
  const t = useTranslations('ProductDetail');
  const Component = as;
  const NameTag = nameAs;

  return (
    <Component
      className={
        isStacked
          ? 'flex w-full flex-col gap-3.5 overflow-visible md:gap-4'
          : `flex w-full gap-3 overflow-visible ${isAlignCenter ? 'items-center' : 'items-start'}`
      }
    >
      <Image
        src={logoUrl ?? '/images/default-product-icon.svg'}
        unoptimized={!logoUrl}
        alt={t('productItem.logoAlt', { name })}
        width={logoSizes[logoSize].imageSize}
        height={logoSizes[logoSize].imageSize}
        className={`shrink-0 object-contain ${logoSize === 'small' ? 'rounded-xl' : 'rounded-2xl'}`}
      />
      <div className="flex min-w-0 flex-col gap-2 overflow-hidden">
        <div className="flex flex-col gap-0.5">
          <NameTag
            className={`m-0 text-base font-semibold tracking-tight text-dark-900 ${isStacked ? 'line-clamp-2' : 'md:text-lg'}`}
          >
            {name}
          </NameTag>
          {summary &&
            (isStacked ? (
              <p className="line-clamp-2 text-sm leading-snug text-dark-500">{summary}</p>
            ) : isSummaryNoWrap ? (
              <p className="w-full overflow-hidden text-ellipsis whitespace-nowrap text-sm leading-snug text-dark-500">
                {summary}
              </p>
            ) : (
              <p className="text-sm leading-snug text-dark-500">{summary}</p>
            ))}
        </div>
        {(tags || specialTags) && (
          <div className={`flex items-center gap-1.5 overflow-x-auto ${isStacked ? '' : 'mr-3'}`}>
            {tags &&
              (maxTagItems && tags.length > maxTagItems ? (
                <div className="flex items-center gap-2">
                  {tags.slice(0, maxTagItems).map(tag => (
                    <Chip
                      key={`tag-${tag}`}
                      variant={tagVariant}
                      color={tagVariant === 'square' ? 'filledGray' : 'outlineGray'}
                    >
                      {tag}
                    </Chip>
                  ))}
                  <span className="text-xs font-medium text-dark-400">+{tags.length - maxTagItems}</span>
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
        )}
      </div>
    </Component>
  );
};

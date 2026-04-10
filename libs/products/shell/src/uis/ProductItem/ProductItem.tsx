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
};

const logoSizes = {
  small: {
    imageSize: 56,
    borderRadius: 12,
  },
  medium: {
    imageSize: 72,
    borderRadius: 16,
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
}: ProductItemProps) => {
  const t = useTranslations('ProductDetail');
  const Component = as;
  const NameTag = nameAs;

  return (
    <Component className={`flex w-full gap-3 overflow-visible ${isAlignCenter ? 'items-center' : 'items-start'}`}>
      <Image
        src={logoUrl ?? '/images/default-product-icon.svg'}
        unoptimized={!logoUrl}
        alt={t('productItem.logoAlt', { name })}
        width={logoSizes[logoSize].imageSize}
        height={logoSizes[logoSize].imageSize}
        style={{
          objectFit: 'contain',
          borderRadius: logoSizes[logoSize].borderRadius,
          boxShadow: 'rgba(0, 0, 0, 0.08) 0px 1px 1px 0.8px',
        }}
      />
      <div className="flex min-w-0 flex-col gap-1 overflow-hidden">
        <div className="flex flex-col gap-1">
          <NameTag className="m-0 text-[18px] font-bold tracking-[-0.4px] text-dark-900 md:text-[20px]">{name}</NameTag>
          {summary &&
            (isSummaryNoWrap ? (
              <p className="w-full overflow-hidden text-ellipsis whitespace-nowrap text-[12px] leading-[1.5] text-dark-500 md:text-[14px]">
                {summary}
              </p>
            ) : (
              <p className="text-[12px] leading-[1.5] text-dark-500 md:text-[14px]">{summary}</p>
            ))}
        </div>
        {(tags || specialTags) && (
          <div className="mr-3 flex items-center gap-1 overflow-x-auto">
            {tags &&
              (maxTagItems && tags.length > maxTagItems ? (
                <div className="flex items-center gap-1">
                  {tags.slice(0, maxTagItems).map(tag => (
                    <Chip
                      key={`tag-${tag}`}
                      variant={tagVariant}
                      color={tagVariant === 'square' ? 'filledGray' : 'outlineGray'}
                    >
                      {tag}
                    </Chip>
                  ))}
                  <span className="text-[12px] text-dark-500">+{tags.length - maxTagItems}</span>
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
                <span className="text-dark-500">•</span>
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

'use client';

import { Chip } from '@darun/ui-foundation';
import { HStack, VStack, Text } from '@kuma-ui/core';
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

  return (
    <HStack
      as={as}
      width={'100%'}
      gap={'12px'}
      alignItems={isAlignCenter ? 'center' : 'flex-start'}
      overflow={'visible'}
    >
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
      <VStack gap={'4px'} overflow={'hidden'}>
        <VStack gap="4px">
          <Text
            as={nameAs}
            fontSize={['18px', '20px']}
            fontWeight={'fontWeights.bold'}
            letterSpacing={'-.4px'}
            color={'colors.dark.900'}
            margin={0}
          >
            {name}
          </Text>
          {summary &&
            (isSummaryNoWrap ? (
              <Text
                fontSize={['12px', '14px']}
                lineHeight={'1.5'}
                color={'colors.dark.500'}
                textOverflow={'ellipsis'}
                overflow={'hidden'}
                whiteSpace={'nowrap'}
                width={'100%'}
              >
                {summary}
              </Text>
            ) : (
              <Text fontSize={['12px', '14px']} lineHeight={'1.5'} color={'colors.dark.500'}>
                {summary}
              </Text>
            ))}
        </VStack>
        {(tags || specialTags) && (
          <HStack gap="4px" alignItems={'center'} overflowX={'auto'} mr={'12px'}>
            {tags &&
              (maxTagItems && tags.length > maxTagItems ? (
                <HStack alignItems={'center'} gap="4px">
                  {tags.slice(0, maxTagItems).map(tag => (
                    <Chip
                      key={`tag-${tag}`}
                      variant={tagVariant}
                      color={tagVariant === 'square' ? 'filledGray' : 'outlineGray'}
                    >
                      {tag}
                    </Chip>
                  ))}
                  <Text color={'colors.dark.500'} fontSize={'12px'}>
                    +{tags.length - maxTagItems}
                  </Text>
                </HStack>
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
                <Text color={'colors.dark.500'}>•</Text>
                {specialTags.map(tag => (
                  <Chip key={`special-tag-${tag}`} variant={tagVariant} color="filledDark">
                    {tag}
                  </Chip>
                ))}
              </>
            )}
          </HStack>
        )}
      </VStack>
    </HStack>
  );
};

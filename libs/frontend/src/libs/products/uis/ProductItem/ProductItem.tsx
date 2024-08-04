import { Chip } from '@darun/ui-foundation';
import { HStack, VStack, Text } from '@kuma-ui/core';
import Image from 'next/image';
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
  isAlignCenter?: boolean;
  nameAs?: 'h3' | 'h2' | 'h1';
};

const logoSizes = {
  small: {
    imageSize: 56,
    borderRadius: 8,
  },
  medium: {
    imageSize: 72,
    borderRadius: 12,
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
  isAlignCenter,
  nameAs = 'h3',
}: ProductItemProps) => {
  return (
    <HStack
      as={as}
      width={'100%'}
      gap={'12px'}
      alignItems={isAlignCenter ? 'center' : 'flex-start'}
      overflow={'hidden'}
    >
      <Image
        src={logoUrl ?? '/images/default-product-icon.svg'}
        unoptimized={!logoUrl}
        alt={`${name} 서비스 로고`}
        width={logoSizes[logoSize].imageSize}
        height={logoSizes[logoSize].imageSize}
        style={{
          objectFit: 'contain',
          borderRadius: logoSizes[logoSize].borderRadius,
          border: '1px solid rgba(0, 0, 0, 0.15)',
        }}
      />
      <VStack gap={'8px'} overflow={'hidden'}>
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
        </VStack>
        {(tags || specialTags) && (
          <HStack gap="4px" alignItems={'center'}>
            {tags &&
              tags.map((tag, i) => (
                <Chip key={i} variant={tagVariant} color={tagVariant === 'square' ? 'filledGray' : 'outlineGray'}>
                  {tag}
                </Chip>
              ))}
            {specialTags && (
              <>
                <Text color={'colors.dark.500'}>•</Text>
                {specialTags.map((tag, i) => (
                  <Chip key={i} variant={tagVariant} color="filledDark">
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

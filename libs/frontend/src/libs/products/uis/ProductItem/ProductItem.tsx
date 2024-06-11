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
}: ProductItemProps) => {
  return (
    <HStack as={as} width={'100%'} gap={'12px'} alignItems={'center'}>
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
      <VStack gap={'8px'}>
        <VStack gap="4px">
          <Text
            as="h3"
            fontSize={'20px'}
            fontWeight={'fontWeights.bold'}
            letterSpacing={'-.4px'}
            color={'colors.dark.900'}
          >
            {name}
          </Text>
          <Text fontSize={'14px'} lineHeight={'1.3'} color={'colors.dark.500'}>
            {summary}
          </Text>
        </VStack>
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
      </VStack>
    </HStack>
  );
};

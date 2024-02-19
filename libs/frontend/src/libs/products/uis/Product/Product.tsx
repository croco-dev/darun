import { Chip } from '@darun/ui-foundation';
import { HStack, VStack, Text } from '@kuma-ui/core';
import Image from 'next/image';
import React from 'react';

type ProductProps = {
  logoUrl?: string;
  logoSize?: keyof typeof logoSizes;
  name: string;
  summary?: string;
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

export function Product({ logoUrl, logoSize = 'medium', name, summary, tags, specialTags }: ProductProps) {
  return (
    <HStack width={'100%'} gap={'12px'} alignItems={'center'}>
      <Image
        src={logoUrl ?? 'https://via.placeholder.com/72'}
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
      <VStack gap={'6px'}>
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
          <Text fontSize={'14px'} letterSpacing={'-.4px'} color={'colors.dark.500'}>
            {summary}
          </Text>
        </VStack>
        <HStack gap="4px" alignItems={'center'}>
          {tags && tags.map((tag, i) => <Chip key={i}>{tag}</Chip>)}
          {specialTags && (
            <>
              <Text color={'colors.dark.500'}>•</Text>
              {specialTags.map((tag, i) => (
                <Chip key={i} variant="square" color="filledDark">
                  {tag}
                </Chip>
              ))}
            </>
          )}
        </HStack>
      </VStack>
    </HStack>
  );
}

'use client';

import { bind } from '@croco/utils-structure-react';
import { ShadowButton } from '@darun/ui-foundation';
import { HStack, Text, VStack } from '@kuma-ui/core';
import Image from 'next/image';
import Link from 'next/link';
import { useProductLinks } from './useProductLinks';

export const ProductLinks = bind(useProductLinks, ({ links }) => (
  <>
    {links.map((link, index) => (
      <Link key={link.id} href={link.link} target="_blank">
        <ShadowButton kind={index === 0 ? 'primary' : 'text'}>
          <HStack alignItems={'center'} justifyContent={'center'} gap={'8px'} px={'2px'} py={'2px'}>
            <Image src={link.iconUrl} alt={link.title} width={24} height={24} />
            <VStack alignItems={'flex-start'} gap={'2px'}>
              <Text
                width="max-content"
                as={'span'}
                fontWeight={'fontWeights.medium'}
                fontSize={'15px'}
                wordBreak={'keep-all'}
                color={index === 0 ? undefined : 'colors.dark.900'}
              >
                {link.title}
              </Text>
              <Text
                as={'span'}
                fontWeight={'fontWeights.medium'}
                fontSize={'13px'}
                color={index === 0 ? 'colors.dark.200' : 'colors.dark.400'}
                wordBreak={'keep-all'}
              >
                {link.displayLink}
              </Text>
            </VStack>
          </HStack>
        </ShadowButton>
      </Link>
    ))}
  </>
));

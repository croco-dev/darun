'use client';

import { bind } from '@croco/utils-structure-react';
import { ContentArea, ShadowButton } from '@darun/ui-foundation';
import { HStack, VStack, Text, Flex } from '@kuma-ui/core';
import { ProductInformation, ProductUserAction, ProductTableOfContent } from '@products/components';
import Image from 'next/image';
import Link from 'next/link';
import { useProductDetailHeader } from './useProductDetailHeader';

export const ProductDetailHeader = bind(useProductDetailHeader, ({ slug, links }) => (
  <VStack gap={'2px'} mb={'12px'}>
    <ContentArea>
      <VStack gap={'8px'}>
        <HStack py="16px" justifyContent={'space-between'} alignItems={'center'}>
          <ProductInformation slug={slug} />
          <ProductUserAction />
        </HStack>
        <HStack gap={'12px'} pb={'12px'}>
          {links.map((link, index) => (
            <Link key={link.id} href={link.link}>
              <ShadowButton kind={index === 0 ? 'primary' : 'text'}>
                <HStack alignItems={'center'} justifyContent={'center'} gap={'8px'} px={'2px'} py={'2px'}>
                  <Image src={link.iconUrl} alt={link.title} width={24} height={24} />
                  <VStack alignItems={'flex-start'} gap={'2px'}>
                    <Text
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
        </HStack>
      </VStack>
    </ContentArea>
    <Flex w={'100%'} h={'1px'} background={'colors.dark.100'} my={'2px'} />
    <ContentArea>
      <ProductTableOfContent />
    </ContentArea>
    <Flex w={'100%'} h={'1px'} background={'colors.dark.100'} my={'2px'} />
  </VStack>
));

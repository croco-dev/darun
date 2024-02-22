'use client';

import { ContentArea, ShadowButton } from '@darun/ui-foundation';
import { InternetIcon } from '@darun/ui-icons';
import { HStack, VStack, Text, Flex } from '@kuma-ui/core';
import { ProductSingle, ProductUserAction, ProductTableOfContent } from '@products/components';

type ProductDetailHeaderProps = {
  slug: string;
};

export const ProductDetailHeader = ({ slug }: ProductDetailHeaderProps) => {
  return (
    <VStack gap={'2px'} mb={'12px'}>
      <ContentArea>
        <VStack gap={'8px'}>
          <HStack py="16px" justifyContent={'space-between'} alignItems={'center'}>
            <ProductSingle slug={slug} />
            <ProductUserAction />
          </HStack>
          <HStack gap={'12px'} pb={'12px'}>
            <ShadowButton kind={'primary'}>
              <HStack alignItems={'center'} justifyContent={'center'} gap={'8px'} px={'2px'} py={'2px'}>
                <InternetIcon size={24} color={'#fff'} />
                <VStack alignItems={'flex-start'} gap={'2px'}>
                  <Text as={'span'} fontWeight={'fontWeights.medium'} fontSize={'15px'} wordBreak={'keep-all'}>
                    홈페이지
                  </Text>
                  <Text
                    as={'span'}
                    fontWeight={'fontWeights.medium'}
                    fontSize={'13px'}
                    color={'colors.dark.200'}
                    wordBreak={'keep-all'}
                  >
                    toss.im
                  </Text>
                </VStack>
              </HStack>
            </ShadowButton>
            <ShadowButton kind={'text'}>
              <HStack alignItems={'center'} justifyContent={'center'} gap={'8px'} px={'2px'} py={'2px'}>
                <InternetIcon size={24} color={'#333'} />
                <VStack alignItems={'flex-start'} gap={'2px'}>
                  <Text
                    as={'span'}
                    fontWeight={'fontWeights.medium'}
                    fontSize={'15px'}
                    color={'colors.dark.900'}
                    wordBreak={'keep-all'}
                  >
                    홈페이지
                  </Text>
                  <Text
                    as={'span'}
                    fontWeight={'fontWeights.medium'}
                    fontSize={'13px'}
                    color={'colors.dark.400'}
                    wordBreak={'keep-all'}
                  >
                    toss.im
                  </Text>
                </VStack>
              </HStack>
            </ShadowButton>
          </HStack>
        </VStack>
      </ContentArea>
      <Flex w={'100%'} h={'1px'} background={'colors.dark.100'} my={'2px'} />
      <ContentArea>
        <ProductTableOfContent />
      </ContentArea>
      <Flex w={'100%'} h={'1px'} background={'colors.dark.100'} my={'2px'} />
    </VStack>
  );
};

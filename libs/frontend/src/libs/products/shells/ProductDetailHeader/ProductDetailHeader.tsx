import { ShadowButton } from '@darun/ui-foundation';
import { HeartIcon, InternetIcon } from '@darun/ui-icons';
import { HStack, VStack, Text } from '@kuma-ui/core';
import { ProductSingle } from '@products/components';

type ProductDetailHeaderProps = {
  slug: string;
};

export const ProductDetailHeader = ({ slug }: ProductDetailHeaderProps) => {
  return (
    <VStack gap={'12px'}>
      <HStack py="16px" justifyContent={'space-between'} alignItems={'center'}>
        <ProductSingle slug={slug} />
        <ShadowButton>
          <VStack alignItems={'center'} justifyContent={'center'} gap={'4px'} px={'2px'} py={'2px'}>
            <HeartIcon size={18} color={'#555'} />
            <Text
              as={'span'}
              fontWeight={'fontWeights.medium'}
              fontSize={'14px'}
              color={'colors.dark.700'}
              wordBreak={'keep-all'}
            >
              관심
            </Text>
          </VStack>
        </ShadowButton>
      </HStack>
      <HStack gap={'8px'}>
        <ShadowButton kind={'primary'}>
          <HStack alignItems={'center'} justifyContent={'center'} gap={'8px'} px={'2px'} py={'2px'}>
            <InternetIcon size={24} color={'#fff'} />
            <VStack alignItems={'flex-start'} gap={'2px'}>
              <Text
                as={'span'}
                fontWeight={'fontWeights.medium'}
                fontSize={'15px'}
                color={'colors.dark.000'}
                wordBreak={'keep-all'}
              >
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
      </HStack>
    </VStack>
  );
};

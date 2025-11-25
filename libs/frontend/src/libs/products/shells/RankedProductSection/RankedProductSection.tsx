import { VStack, Text } from '@kuma-ui/core';
import { RankedProductList } from '@products/components';

export const RankedProductSection = () => (
  <VStack as="section" gap={'20px'} width={'100%'} py={'16px'}>
    <VStack gap={'4px'}>
      <Text
        fontWeight={'fontWeights.semibold'}
        fontSize={['20px', '24px']}
        color={'colors.dark.900'}
        letterSpacing={'-.4px'}
        as="h2"
        className={'darun-heading'}
      >
        인기 서비스 Top 30
      </Text>
      <Text
        fontWeight={'fontWeights.medium'}
        fontSize={['14px', '16px']}
        color={'colors.dark.600'}
        letterSpacing={'-.4px'}
        as="h2"
      >
        가장 많은 관심을 받은 서비스들입니다.
      </Text>
    </VStack>
    <RankedProductList />
  </VStack>
);

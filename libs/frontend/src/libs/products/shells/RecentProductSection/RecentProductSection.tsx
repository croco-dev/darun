import { VStack, Text } from '@kuma-ui/core';
import { RecentProductList } from '@products/components';

export const RecentProductSection = () => (
  <VStack as="section" gap={'20px'} width={'100%'} py={'16px'}>
    <VStack gap={'4px'}>
      <Text fontWeight={'fontWeights.semibold'} fontSize={'24px'} color={'colors.dark.900'} letterSpacing={'-.4px'}>
        새롭게 추가 된 서비스
      </Text>
      <Text fontWeight={'fontWeights.medium'} fontSize={'16px'} color={'colors.dark.600'} letterSpacing={'-.4px'}>
        ‘다른’ 팀이 엄격한 기준으로 비교한 서비스를 찾아볼 수 있습니다.
      </Text>
    </VStack>
    <RecentProductList />
  </VStack>
);

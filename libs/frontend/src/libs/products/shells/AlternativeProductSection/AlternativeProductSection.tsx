import { Text, VStack } from '@kuma-ui/core';
import { ProductAlternativeList } from '../../components/ProductAlternativeList';

type AlternativeProductSectionProps = {
  slug: string;
};

export const AlternativeProductSection = ({ slug }: AlternativeProductSectionProps) => (
  <VStack as="section" gap={'20px'} py={'16px'}>
    <VStack gap={'4px'}>
      <Text fontWeight={'fontWeights.semibold'} fontSize={'24px'} color={'colors.dark.900'} letterSpacing={'-.4px'}>
        더 많은 다른 서비스
      </Text>
      <Text fontWeight={'fontWeights.medium'} fontSize={'16px'} color={'colors.dark.600'} letterSpacing={'-.4px'}>
        ‘다른’ 팀이 직접 엄선한 정확한 대안 서비스들입니다.
      </Text>
    </VStack>
    <ProductAlternativeList slug={slug} />
  </VStack>
);

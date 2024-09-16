import { Text, VStack } from '@kuma-ui/core';
import { ProductCompany } from '@products/components';

type ProductDetailCompanySectionProps = { slug: string };

export const ProductDetailCompanySection = ({ slug }: ProductDetailCompanySectionProps) => (
  <VStack as="section" gap={'20px'} py={'16px'}>
    <VStack gap={'6px'}>
      <Text
        as={'h2'}
        id={'company-info'}
        fontWeight={'fontWeights.semibold'}
        fontSize={'24px'}
        color={'colors.dark.900'}
        className={'darun-heading'}
        letterSpacing={'-.4px'}
      >
        운영사 정보
      </Text>
      <Text
        as={'p'}
        fontWeight={'fontWeights.medium'}
        fontSize={'15px'}
        color={'colors.dark.600'}
        letterSpacing={'-.06px'}
      >
        서비스를 운영하는 기업에 대한 정보를 제공합니다. 실제 정보와 다를 수 있으므로, 참고용으로만 확인하세요.
      </Text>
    </VStack>
    <ProductCompany slug={slug} />
  </VStack>
);

import { ContentArea } from '@darun/ui-foundation';
import { Flex, HStack, VStack } from '@kuma-ui/core';
import { ProductSingle } from '@products/components';

type ProductDetailHeaderProps = {
  slug: string;
};

export const ProductDetailHeader = ({ slug }: ProductDetailHeaderProps) => {
  return (
    <Flex>
      <ContentArea>
        <VStack>
          <HStack py="16px">
            <ProductSingle slug={slug} />
          </HStack>
        </VStack>
      </ContentArea>
    </Flex>
  );
};

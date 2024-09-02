import { Flex, Grid, HStack, Text, VStack } from '@kuma-ui/core';

type ProductFeatureGridListProps = {
  features: {
    emoji?: string;
    id: string;
    name: string;
    summary?: string;
  }[];
};

export const ProductFeatureGridList = ({ features }: ProductFeatureGridListProps) => {
  return (
    <Grid gap="16px" gridTemplateColumns={['repeat(1, 1fr)', 'repeat(2, 1fr)', 'repeat(3, 1fr)']}>
      {features.map((feature, index) => (
        <HStack alignItems={'flex-start'} gap={['8px', '8px', '12px']} w={'100%'} key={index}>
          <Flex
            width={['36px', '36px', '42px']}
            height={['36px', '36px', '42px']}
            alignItems={'center'}
            justifyContent={'center'}
            bg={'colors.dark.100'}
            borderStyle={'solid'}
            borderWidth={'1px'}
            borderColor={'rgba(0, 0, 0, 0.1)'}
            borderRadius={'8px'}
            flexShrink={0}
          >
            <Text fontSize={['16px', '16px', '20px']}>{feature.emoji ?? '💎'}</Text>
          </Flex>
          <VStack gap="4px">
            <Text
              color={'colors.dark.800'}
              fontWeight={'fontWeights.semibold'}
              fontSize={'15px'}
              letterSpacing={'-.072px'}
            >
              {feature.name}
            </Text>
            <Text
              color={'colors.dark.600'}
              fontWeight={'fontWeights.normal'}
              fontSize={'13px'}
              letterSpacing={'-.1px'}
              textAlign={'justify'}
              lineBreak={'anywhere'}
              lineHeight={'1.3'}
            >
              {feature.summary}
            </Text>
          </VStack>
        </HStack>
      ))}
    </Grid>
  );
};

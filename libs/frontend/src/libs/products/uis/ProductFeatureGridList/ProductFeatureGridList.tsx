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
    <Grid gap="6px" gridTemplateColumns={['repeat(1, 1fr)', 'repeat(2, 1fr)', 'repeat(3, 1fr)']}>
      {features.map((feature, index) => (
        <HStack alignItems={'flex-start'} gap={'12px'} w={'100%'} key={index}>
          <Flex
            width={'42px'}
            height={'42px'}
            alignItems={'center'}
            justifyContent={'center'}
            bg={'colors.dark.100'}
            borderStyle={'solid'}
            borderWidth={'1px'}
            borderColor={'rgba(0, 0, 0, 0.1)'}
            borderRadius={'8px'}
            flexShrink={0}
          >
            <Text fontSize={'20px'}>{feature.emoji ?? '💎'}</Text>
          </Flex>
          <VStack gap={2}>
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
              letterSpacing={'-.05px'}
              lineBreak={'anywhere'}
            >
              {feature.summary}
            </Text>
          </VStack>
        </HStack>
      ))}
    </Grid>
  );
};

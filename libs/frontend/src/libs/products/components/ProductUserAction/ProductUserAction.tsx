import { ShadowButton } from '@darun/ui-foundation';
import { HeartIcon } from '@darun/ui-icons';
import { HStack, Text, VStack } from '@kuma-ui/core';

export const ProductUserAction = () => (
  <HStack gap={'4px'}>
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
);

import { Flex, HStack, VStack, Text, css } from '@kuma-ui/core';
import Image from 'next/image';

type FeatureItemProps = {
  emoji?: string;
  name: string;
  description?: string;
  screenshots?: {
    id: string;
    imageAlt: string;
    imageUrl: string;
  }[];
};

export const FeatureItem = ({ emoji, name, description, screenshots }: FeatureItemProps) => (
  <Flex
    px="16px"
    py="12px"
    borderRadius="8px"
    border="1px solid rgba(0, 0, 0, 0.12)"
    bg="#fff"
    boxShadow="0px 2px 8px 0px rgba(0, 0, 0, 0.08)"
  >
    <VStack gap="16px" w={'100%'}>
      <HStack alignItems={'center'} gap={'12px'}>
        <Flex
          width={'44px'}
          height={'44px'}
          alignItems={'center'}
          justifyContent={'center'}
          bg={'colors.dark.100'}
          borderStyle={'solid'}
          borderWidth={'1px'}
          borderColor={'rgba(0, 0, 0, 0.1)'}
          borderRadius={'8px'}
        >
          <Text fontSize={'22px'}>{emoji ?? '💎'}</Text>
        </Flex>
        <VStack>
          <Text color={'colors.dark.900'} fontWeight={'fontWeights.bold'} fontSize={'18px'} letterSpacing={'-.072px'}>
            {name}
          </Text>
          {description && (
            <Text
              color={'colors.dark.600'}
              fontWeight={'fontWeights.normal'}
              fontSize={'14px'}
              letterSpacing={'-.05px'}
            >
              토스의 핵심 기능입니다. 몇 번의 터치만으로 원하는 사용자에게 간단히 송금할 수 있습니다. <br />
              토스를 사용하는 사용자끼리는 계좌번호 없이도 간단히 돈을 주고 받을 수 있습니다.
            </Text>
          )}
        </VStack>
      </HStack>
      {screenshots && (
        <HStack gap={'8px'} width={'100%'} overflow={'auto'}>
          {screenshots.map(screenshot => (
            <Image
              key={screenshot.id}
              src={screenshot.imageUrl}
              alt={screenshot.imageAlt}
              sizes="800px"
              fill
              className={css`
                border-radius: 4px;
                border: 1px solid rgba(0, 0, 0, 0.04);
                object-fit: contain;
                width: auto !important;
                height: 220px !important;
                position: relative !important;
              `}
            />
          ))}
        </HStack>
      )}
    </VStack>
  </Flex>
);

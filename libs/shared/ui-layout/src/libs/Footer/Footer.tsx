import { bind } from '@croco/utils-structure-react';
import { ContentArea } from '@darun/ui-foundation';
import { HStack, VStack, Text, Flex } from '@kuma-ui/core';
import { useFooter } from './useFooter';

export const Footer = bind(useFooter, () => (
  <Flex as={'footer'} py={28}>
    <ContentArea>
      <HStack justifyContent={'space-between'}>
        <VStack gap={4}>
          <HStack gap={6}>
            <Text as={'span'} fontSize={14} fontWeight={'fontWeights.medium'} color={'colors.dark.600'}>
              &copy; 2024 Croco
            </Text>
            <Text as={'span'} fontSize={14} fontWeight={'fontWeights.medium'} color={'colors.dark.400'}>
              •
            </Text>
            <Text as={'span'} fontSize={14} fontWeight={'fontWeights.medium'} color={'colors.dark.600'}>
              개인정보처리방침
            </Text>
            <Text as={'span'} fontSize={14} fontWeight={'fontWeights.medium'} color={'colors.dark.400'}>
              •
            </Text>
            <Text as={'span'} fontSize={14} fontWeight={'fontWeights.medium'} color={'colors.dark.600'}>
              서비스 약관
            </Text>
            <Text as={'span'} fontSize={14} fontWeight={'fontWeights.medium'} color={'colors.dark.400'}>
              •
            </Text>
            <Text as={'span'} fontSize={14} fontWeight={'fontWeights.medium'} color={'colors.dark.600'}>
              문의
            </Text>
          </HStack>
          <HStack>
            <Text fontSize={13} fontWeight={'fontWeights.normal'} color={'colors.dark.500'}>
              ‘다른’ 서비스는 단순 정보를 제공하며, 각 개별 컨텐츠의 저작권과 소유권을 보유하고 있지 않습니다. <br />
              ‘다른’ 서비스는 공신력 있는 매체가 아닙니다. 사이트에 있는 내용을 맹신하지 마세요.
            </Text>
          </HStack>
        </VStack>
        <HStack gap={8}></HStack>
      </HStack>
    </ContentArea>
  </Flex>
));

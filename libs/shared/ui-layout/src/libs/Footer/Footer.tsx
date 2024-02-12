import { bind } from '@croco/utils-structure-react';
import { ContentArea } from '@darun/ui-foundation';
import { Box, HStack, VStack } from '@kuma-ui/core';
import { ReactNode } from 'react';
import { useFooter } from './useFooter';

export const Footer = bind(useFooter, () => (
  <Box as={'footer'} py={28}>
    <ContentArea>
      <HStack justifyContent={'space-between'}>
        <VStack gap={4}>
          <HStack gap={6}>
            <LinkText>&copy; 2024 Croco</LinkText>
            <Dot />
            <LinkText>개인정보처리방침</LinkText>
            <Dot />
            <LinkText>서비스 약관</LinkText>
            <Dot />
            <LinkText>문의</LinkText>
          </HStack>
          <HStack>
            <Box as={'p'} fontSize={13} fontWeight={'fontWeights.normal'} color={'colors.dark.500'}>
              ‘다른’ 서비스는 단순 정보를 제공하며, 각 개별 컨텐츠의 저작권과 소유권을 보유하고 있지 않습니다. <br />
              ‘다른’ 서비스는 공신력 있는 매체가 아닙니다. 사이트에 있는 내용을 맹신하지 마세요.
            </Box>
          </HStack>
        </VStack>
        <HStack gap={8}></HStack>
      </HStack>
    </ContentArea>
  </Box>
));

const LinkText = ({ children, type = 'default' }: { children: ReactNode; type?: 'default' | 'dot' }) => (
  <Box
    as={'span'}
    fontSize={14}
    fontWeight={'fontWeights.medium'}
    color={type === 'default' ? 'colors.dark.600' : 'colors.dark.400'}
  >
    {children}
  </Box>
);

const Dot = () => <LinkText type={'dot'}>•</LinkText>;

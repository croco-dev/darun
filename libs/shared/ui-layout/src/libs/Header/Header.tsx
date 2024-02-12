import { bind } from '@croco/utils-structure-react';
import { ContainedButton, Container, Logo } from '@darun/ui-foundation';
import { Box, HStack, Input } from '@kuma-ui/core';
import { ReactNode } from 'react';
import { HeaderLoginButton } from '../HeaderLoginButton';
import { SearchIcon } from './SearchIcon';
import { useHeader } from './useHeader';

export const Header = bind(useHeader, () => (
  <Box as={'nav'} display={'flex'} width={'100%'}>
    <Container>
      <HStack width="100%" justify="space-between" alignItems="center" gap={24} paddingY={'14px'}>
        <HStack gap={24}>
          <Box>
            <Logo size={36} />
          </Box>
          <HStack alignItems="center" gap={12}>
            <LinkItem>랭킹</LinkItem>
            <LinkItem>둘러보기</LinkItem>
          </HStack>
        </HStack>
        <HStack
          flexGrow={1}
          borderRadius={14}
          border="1px solid rgba(0, 0, 0, 0.15)"
          px={16}
          py={11}
          borderStyle="solid"
          gap={8}
          boxShadow="0px 2px 4px 0px rgba(0, 0, 0, 0.08)"
        >
          <SearchIcon size={18} />
          <Input
            width="100%"
            border="none"
            outline="none"
            placeholder="현재 사용 중인 서비스를 찾아보세요!"
            color="#555"
            fontSize={14}
            letterSpacing={-0.1}
          />
        </HStack>
        <HStack height="max-content" gap={8}>
          <HeaderLoginButton />
          <ContainedButton kind="dark">제보하기</ContainedButton>
        </HStack>
      </HStack>
    </Container>
  </Box>
));

const LinkItem = ({ href, children }: { href?: string; children: ReactNode }) => (
  <Box
    as={'a'}
    href={href ?? '#'}
    fontSize={15}
    fontWeight={'fontWeights.medium'}
    color={'colors.dark.700'}
    textDecoration={'none'}
  >
    {children}
  </Box>
);

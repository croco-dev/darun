import { bind } from '@croco/utils-structure-react';
import { ContainedButton, ContentArea, Logo } from '@darun/ui-foundation';
import { Box, HStack, Input } from '@kuma-ui/core';
import { HeaderLoginButton } from '../HeaderLoginButton';
import { HeaderQuickItem } from '../HeaderQuickItem';
import { SearchIcon } from './SearchIcon';
import { useHeader } from './useHeader';

export const Header = bind(useHeader, () => (
  <Box as={'nav'} display={'flex'} width={'100%'}>
    <ContentArea>
      <HStack width="100%" justify="space-between" alignItems="center" gap={24} paddingY={'14px'}>
        <HStack gap={24}>
          <HStack alignItems="center">
            <Logo size={36} />
          </HStack>
          <HStack alignItems="center" gap={12}>
            <HeaderQuickItem>랭킹</HeaderQuickItem>
            <HeaderQuickItem>둘러보기</HeaderQuickItem>
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
    </ContentArea>
  </Box>
));

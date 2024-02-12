import { bind } from '@croco/utils-structure-react';
import { ContainedButton, TextButton } from '@darun/ui-foundation';
import { Box, HStack, Input } from '@kuma-ui/core';
import { HeaderLoginButton } from '../HeaderLoginButton';
import { SearchIcon } from './SearchIcon';
import { useHeader } from './useHeader';

export const Header = bind(useHeader, () => (
  <HStack width="100%" maxWidth={1130} justify="space-between" alignItems="center" gap={24} margin="auto">
    <HStack gap={20}>
      <Box>logo</Box>
      <HStack gap={8}>
        <Box>랭킹</Box>
        <Box>둘러보기</Box>
      </HStack>
    </HStack>
    <HStack
      flexGrow={1}
      borderRadius={14}
      borderWidth={1}
      borderColor="rgba(0, 0, 0, 0.15)"
      px={16}
      py={11}
      borderStyle="solid"
      gap={8}
    >
      <SearchIcon size={18} />
      <Input
        width="100%"
        border="none"
        outline="none"
        placeholder="현재 사용 중인 서비스를 찾아보세요!"
        color="#555"
        fontSize={14}
      />
    </HStack>
    <HStack height="max-content" gap={8}>
      <HeaderLoginButton />
      <ContainedButton kind="primary">제보하기</ContainedButton>
    </HStack>
  </HStack>
));

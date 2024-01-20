import { bind } from '@croco/utils-structure-react';
import { ContainedButton, TextButton } from '@darun/ui-foundation';
import { Box, HStack, Input } from '@kuma-ui/core';
import { useHeader } from './useHeader';

export const Header = bind(useHeader, () => (
  <HStack width="100%" maxWidth={1130} justify="space-between" alignItems="center" gap={16} margin="auto">
    <HStack gap={8}>
      <Box>logo</Box>
      <Box>랭킹</Box>
      <Box>둘러보기</Box>
    </HStack>
    <Input
      flexGrow={1}
      borderRadius={20}
      borderWidth={1}
      borderColor="lightgray"
      px={20}
      py={16}
      borderStyle="solid"
      placeholder="🔎 현재 사용 중인 서비스를 찾아보세요!"
    />
    <HStack height="max-content" gap={8}>
      <TextButton>로그인</TextButton>
      <ContainedButton kind="primary">제보하기</ContainedButton>
    </HStack>
  </HStack>
));

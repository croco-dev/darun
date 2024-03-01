import { bind } from '@croco/utils-structure-react';
import { ContainedButton, ContentArea, Logo } from '@darun/ui-foundation';
import { SearchIcon } from '@darun/ui-icons';
import { Link as RouterLink } from '@darun/utils-router';
import { Flex, HStack, Input, Link } from '@kuma-ui/core';
import { HeaderLoginButton } from '../HeaderLoginButton';
import { useHeader } from './useHeader';

export const Header = bind(useHeader, () => (
  <Flex as={'nav'} display={'flex'} width={'100%'}>
    <ContentArea>
      <HStack width="100%" justify="space-between" alignItems="center" gap={24} paddingY={'14px'}>
        <HStack gap={24}>
          <HStack alignItems="center">
            <Link href="/" as={RouterLink}>
              <Logo size={36} />
            </Link>
          </HStack>
          <HStack alignItems="center" gap={12}>
            <Link
              href={'#'}
              as={RouterLink}
              fontSize={15}
              fontWeight={'fontWeights.medium'}
              color={'colors.dark.700'}
              textDecoration={'none'}
            >
              랭킹
            </Link>
            <Link
              href={'#'}
              as={RouterLink}
              fontSize={15}
              fontWeight={'fontWeights.medium'}
              color={'colors.dark.700'}
              textDecoration={'none'}
            >
              둘러보기
            </Link>
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
          <ContainedButton kind="primary">제보하기</ContainedButton>
        </HStack>
      </HStack>
    </ContentArea>
  </Flex>
));

import { bind } from '@croco/utils-structure-react';
import { ContainedButton, ContentArea, Logo } from '@darun/ui-foundation';
import { Link as RouterLink } from '@darun/utils-router';
import { Flex, HStack, Link } from '@kuma-ui/core';
import { Suspense } from 'react';
import { HeaderLoginButton } from '../HeaderLoginButton';
import { HeaderSearchForm } from '../HeaderSearchForm';
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
          <HStack alignItems="center" gap={12} display={['none', 'flex']}>
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
        <Suspense fallback={<></>}>
          <HeaderSearchForm />
        </Suspense>
        <HStack height="max-content" gap={8} display={['none', 'flex']}>
          <HeaderLoginButton />
          <ContainedButton kind="primary">제보하기</ContainedButton>
        </HStack>
      </HStack>
    </ContentArea>
  </Flex>
));

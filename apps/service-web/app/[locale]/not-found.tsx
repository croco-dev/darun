import { ContentArea, ShadowButton } from '@darun/ui-foundation';
import { Layout } from '@darun/ui-layout';
import { Heading, Text, VStack } from '@kuma-ui/core';
import { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: '페이지를 찾을 수 없습니다 - 다른',
};

export default function NotFound() {
  return (
    <Layout>
      <ContentArea>
        <VStack alignItems="center" justifyContent="center" py={160} gap={24} textAlign="center">
          <Heading as="h1" fontSize="24px" fontWeight="bold">
            페이지를 찾을 수 없습니다
          </Heading>
          <Text color="colors.gray.600" fontSize="16px">
            요청하신 페이지가 사라졌거나 잘못된 경로입니다.
          </Text>
          <Link href="/">
            <ShadowButton kind="primary">홈으로 돌아가기</ShadowButton>
          </Link>
        </VStack>
      </ContentArea>
    </Layout>
  );
}

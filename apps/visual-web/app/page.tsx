import { ContentArea } from '@darun/ui-foundation';
import { Layout } from '@darun/ui-layout';
import { Text, VStack } from '@kuma-ui/core';

export default function Page() {
  return (
    <Layout>
      <VStack as={'main'} width={'100%'} py={'40px'}>
        <ContentArea>
          <Text fontWeight={'fontWeights.semibold'} fontSize={'22px'} letterSpacing={'-.2px'}>
            다른 서비스 탐색을 시작해보세요
          </Text>
        </ContentArea>
      </VStack>
    </Layout>
  );
}

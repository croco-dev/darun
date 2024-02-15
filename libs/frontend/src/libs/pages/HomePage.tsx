import { ContentArea } from '@darun/ui-foundation';
import { Layout } from '@darun/ui-layout';
import { VStack } from '@kuma-ui/core';
import { MainHeroBanner, RecentProductSection } from '@products/shells';

export const HomePage = () => (
  <Layout>
    <VStack as={'main'} mt={8} gap={20}>
      <MainHeroBanner />
      <ContentArea>
        <RecentProductSection />
      </ContentArea>
    </VStack>
  </Layout>
);

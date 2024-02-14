import { ContentArea } from '@darun/ui-foundation';
import { Layout } from '@darun/ui-layout';
import { VStack } from '@kuma-ui/core';
import { RecentProductSection } from '@products/shells';

export const HomePage = () => (
  <Layout>
    <main>
      <ContentArea>
        <VStack mt={8}>
          <RecentProductSection />
        </VStack>
      </ContentArea>
    </main>
  </Layout>
);

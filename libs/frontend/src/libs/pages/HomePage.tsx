import { Header } from '@darun/ui-layout';
import { VStack } from '@kuma-ui/core';
import { RecentProductSection } from '@products/shells';

export const HomePage = () => (
  <main>
    <VStack mt={8}>
      <Header />
    </VStack>
    <RecentProductSection />
  </main>
);

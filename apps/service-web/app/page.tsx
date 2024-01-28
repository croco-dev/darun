import { Header } from '@darun/ui-layout';
import { VStack } from '@kuma-ui/core';
import { ClientRootProvider } from './client';

export default function Home() {
  return (
    <ClientRootProvider>
      <main>
        <VStack mt={8}>
          <Header />
        </VStack>
      </main>
    </ClientRootProvider>
  );
}

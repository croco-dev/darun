import { VStack } from '@kuma-ui/core';
import { ReactNode } from 'react';

import { Footer } from './libs/Footer';
import { Header } from './libs/Header';

export function Layout({ children }: { children: ReactNode }) {
  return (
    <VStack>
      <Header />
      {children}
      <Footer />
    </VStack>
  );
}

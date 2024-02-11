import { VStack } from '@kuma-ui/core';
import { ReactNode } from 'react';

import { Header } from './libs/Header';

export function Layout({ children }: { children: ReactNode }) {
  return (
    <VStack>
      <Header />
      {children}
    </VStack>
  );
}

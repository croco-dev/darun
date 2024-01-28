import { initAuthProvider } from '@darun/provider-auth/server';
import { ReactNode } from 'react';
import { container } from './container';

initAuthProvider({ authService: container.authService });

export const ServerRootProvider = async ({ children }: { children: ReactNode }) => {
  return <>{children}</>;
};

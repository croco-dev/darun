import { initAuthProvider } from '@darun/provider-auth/server';
import { ReactNode } from 'react';
import { container } from './serverContainer';

initAuthProvider({ authService: container.authService });

export const ServerRootProvider = ({ children }: { children: ReactNode }) => {
  return <>{children}</>;
};

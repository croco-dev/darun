'use client';

import { AuthProvider } from '@darun/provider-auth';
import { ReactNode } from 'react';
import { container } from './container';

export const ClientRootProvider = ({ children }: { children: ReactNode }) => {
  return <AuthProvider authService={container.authService}>{children}</AuthProvider>;
};

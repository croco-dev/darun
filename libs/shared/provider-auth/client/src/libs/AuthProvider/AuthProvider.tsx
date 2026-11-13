'use client';

import { ReactNode } from 'react';
import { AuthServiceProvider, AuthServiceProviderProps } from '../AuthServiceProvider';
import { AuthStateProvider, AuthStateProviderProps } from '../AuthStateProvider';

export const AuthProvider = ({
  children,
  navigateToStoredRedirect,
  ...props
}: { children: ReactNode } & AuthServiceProviderProps & AuthStateProviderProps) => {
  return (
    <AuthServiceProvider {...props}>
      <AuthStateProvider navigateToStoredRedirect={navigateToStoredRedirect}>{children}</AuthStateProvider>
    </AuthServiceProvider>
  );
};

'use client';

import { ReactNode } from 'react';
import { AuthServiceProvider, AuthServiceProviderProps } from '../AuthServiceProvider';
import { AuthStateProvider, AuthStateProviderProps } from '../AuthStateProvider';

export const AuthProvider = ({
  children,
  ...props
}: { children: ReactNode } & AuthServiceProviderProps & AuthStateProviderProps) => {
  return (
    <AuthServiceProvider {...props}>
      <AuthStateProvider>{children}</AuthStateProvider>
    </AuthServiceProvider>
  );
};

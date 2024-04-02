'use client';

import { Notifications } from '@mantine/notifications';
import { ReactNode } from 'react';

export function AdditionalMantineProvider({ children }: { children: ReactNode }) {
  return (
    <>
      <Notifications position={'bottom-right'} limit={5} />
      {children}
    </>
  );
}

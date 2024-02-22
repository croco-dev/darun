'use client';

import { AppShell as MantineAppShell } from '@mantine/core';
import { ReactNode } from 'react';

export const AppShell = ({ children }: { children: ReactNode }) => (
  <MantineAppShell
    header={{ height: 60 }}
    navbar={{
      width: 300,
      breakpoint: 'sm',
    }}
    padding="md"
  >
    <MantineAppShell.Header>
      <div>Logo</div>
    </MantineAppShell.Header>

    <MantineAppShell.Navbar p="md">Navbar</MantineAppShell.Navbar>

    <MantineAppShell.Main>{children}</MantineAppShell.Main>
  </MantineAppShell>
);

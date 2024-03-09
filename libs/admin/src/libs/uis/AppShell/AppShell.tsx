'use client';

import { Link } from '@darun/utils-router';
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
      <Link href="/">
        <div>Logo</div>
      </Link>
    </MantineAppShell.Header>

    <MantineAppShell.Navbar p="md">
      <Link href="/products">
        <div>products</div>
      </Link>
    </MantineAppShell.Navbar>

    <MantineAppShell.Main>{children}</MantineAppShell.Main>
  </MantineAppShell>
);

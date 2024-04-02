'use client';

import { Flex } from '@mantine/core';
import { ReactNode } from 'react';
import { Navbar } from '../Navbar';

export const AppShell = ({ children }: { children: ReactNode }) => (
  <Flex>
    <Navbar />
    {children}
  </Flex>
);

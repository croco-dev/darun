'use client';

import { Box, Flex } from '@mantine/core';
import { ReactNode } from 'react';
import { Navbar } from '../Navbar';

export const AppShell = ({ children }: { children: ReactNode }) => (
  <Flex style={{ overflow: 'hidden' }}>
    <Navbar />
    <Box w={'100%'} h={'100vh'} style={{ overflow: 'auto' }}>
      {children}
    </Box>
  </Flex>
);

'use client';

import type { ReactNode } from 'react';
import { Navbar } from '../Navbar';

export const AppShell = ({ children }: { children: ReactNode }) => (
  <div className="flex overflow-hidden">
    <Navbar />
    <div className="w-full h-screen overflow-auto">{children}</div>
  </div>
);

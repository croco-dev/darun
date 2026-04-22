'use client';

import { LazyMotion, domAnimation, MotionConfig } from 'framer-motion';
import { ReactNode } from 'react';

export const MotionProvider = ({ children }: { children: ReactNode }) => (
  <LazyMotion features={domAnimation}>
    <MotionConfig reducedMotion="user">{children}</MotionConfig>
  </LazyMotion>
);

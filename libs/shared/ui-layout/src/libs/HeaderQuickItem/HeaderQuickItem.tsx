import { Box } from '@kuma-ui/core';
import { ReactNode } from 'react';

export const HeaderQuickItem = ({ href, children }: { href?: string; children: ReactNode }) => (
  <Box
    as={'a'}
    href={href ?? '#'}
    fontSize={15}
    fontWeight={'fontWeights.medium'}
    color={'colors.dark.700'}
    textDecoration={'none'}
  >
    {children}
  </Box>
);

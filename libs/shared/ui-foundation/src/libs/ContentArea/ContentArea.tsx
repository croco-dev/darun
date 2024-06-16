import { Box } from '@kuma-ui/core';
import { ElementType, ReactNode } from 'react';

type ContentAreaProps = {
  children: ReactNode;
  as?: ElementType;
};
export function ContentArea({ children, as }: ContentAreaProps) {
  return (
    <Box
      as={as ?? 'section'}
      w="100%"
      mr="auto"
      ml="auto"
      maxW={1120}
      px={['1rem', '1rem', '2rem']}
      boxSizing="border-box"
    >
      {children}
    </Box>
  );
}

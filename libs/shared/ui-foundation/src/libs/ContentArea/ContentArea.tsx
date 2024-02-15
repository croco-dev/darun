import { Flex } from '@kuma-ui/core';
import { ElementType, ReactNode } from 'react';

type ContentAreaProps = {
  children: ReactNode;
  as?: ElementType;
  zIndex?: number;
};
export function ContentArea({ children, as, zIndex }: ContentAreaProps) {
  return (
    <Flex as={as} w="100%" mr="auto" ml="auto" maxW={1120} pr={['1rem', '1rem', '2rem']} zIndex={zIndex}>
      {children}
    </Flex>
  );
}

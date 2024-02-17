import { Flex } from '@kuma-ui/core';
import { ElementType, ReactNode } from 'react';

type ContentAreaProps = {
  children: ReactNode;
  as?: ElementType;
};
export function ContentArea({ children, as }: ContentAreaProps) {
  return (
    <Flex as={as} w="100%" mr="auto" ml="auto" maxW={1120} pr={['1rem', '1rem', '2rem']}>
      {children}
    </Flex>
  );
}

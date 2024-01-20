import { Button as BaseButton } from '@kuma-ui/core';
import { ReactNode } from 'react';

type ButtonProps = {
  children: ReactNode;
};

export const TextButton = ({ children }: ButtonProps) => {
  return (
    <BaseButton px={14} py={8} bg="transparent" color="black" fontSize={13} borderRadius={14} border="none">
      {children}
    </BaseButton>
  );
};

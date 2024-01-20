import { Button as BaseButton } from '@kuma-ui/core';
import { ReactNode } from 'react';

type ButtonProps = {
  children: ReactNode;
};

export const TextButton = ({ children }: ButtonProps) => {
  return (
    <BaseButton px={16} py={10} bg="transparent" color="black" borderRadius={14} border="none">
      {children}
    </BaseButton>
  );
};

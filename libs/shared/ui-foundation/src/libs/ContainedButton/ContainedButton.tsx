import { Button as BaseButton } from '@kuma-ui/core';
import { ReactNode } from 'react';

type ButtonProps = {
  children: ReactNode;
  kind: 'primary' | 'secondary' | 'tertiary';
};

export const ContainedButton = ({ children, kind }: ButtonProps) => {
  return (
    <BaseButton px={16} py={10} bg="black" color="white" borderRadius={14} border="none">
      {children}
    </BaseButton>
  );
};

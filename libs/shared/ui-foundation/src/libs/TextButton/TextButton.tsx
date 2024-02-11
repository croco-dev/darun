import { ReactNode } from 'react';
import { ContainedButton } from '../ContainedButton';

type ButtonProps = {
  children: ReactNode;
};

export const TextButton = ({ children }: ButtonProps) => {
  return <ContainedButton kind={'text'}>{children}</ContainedButton>;
};

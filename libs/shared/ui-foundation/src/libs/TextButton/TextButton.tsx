import { ReactNode } from 'react';
import { ContainedButton } from '../ContainedButton';

type ButtonProps = {
  onClick?: () => void;
  children: ReactNode;
};

export const TextButton = ({ children }: ButtonProps) => {
  return <ContainedButton kind={'text'}>{children}</ContainedButton>;
};

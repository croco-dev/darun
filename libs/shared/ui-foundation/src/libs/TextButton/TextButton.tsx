import { BaseButton, ButtonProps } from '../BaseButton';

export const TextButton = ({ children }: ButtonProps) => {
  return <BaseButton kind={'text'}>{children}</BaseButton>;
};

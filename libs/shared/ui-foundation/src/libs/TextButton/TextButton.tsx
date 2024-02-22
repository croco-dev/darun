import { BaseButton, ButtonProps } from '../BaseButton';

type TextButtonProps = ButtonProps & {
  isActive?: boolean;
};

export const TextButton = ({ children, isActive }: TextButtonProps) => {
  return <BaseButton kind={isActive ? 'textActive' : 'text'}>{children}</BaseButton>;
};

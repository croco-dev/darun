import { Box } from '@kuma-ui/core';
import { BaseButton, ButtonProps } from '../BaseButton';

type TextButtonProps = ButtonProps & {
  isActive?: boolean;
};

export const TextButton = ({ children, isActive }: TextButtonProps) => {
  return (
    <BaseButton kind={isActive ? 'textActive' : 'text'}>
      <Box width="max-content">{children}</Box>
    </BaseButton>
  );
};

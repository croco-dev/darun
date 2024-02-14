import { Button } from '@kuma-ui/core';
import { ButtonHTMLAttributes } from 'react';

export type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement>;

export type BaseButtonKind = keyof typeof kindPreset;

type InternalBaseButtonProps = {
  kind: keyof typeof kindPreset;
};

type BaseButtonProps = ButtonProps & InternalBaseButtonProps;

const kindPreset = {
  text: {
    bgColor: 'transparent',
    textColor: 'colors.dark.900',
  },
  primary: {
    bgColor: 'colors.dark.900',
    textColor: '#fff',
  },
};

export const BaseButton = ({ children, kind, ...props }: BaseButtonProps) => {
  return (
    <Button
      px={14}
      py={8}
      bg={kindPreset[kind].bgColor ?? '#ff0000'}
      color={kindPreset[kind].textColor ?? '#fff'}
      fontSize={14}
      fontWeight={'fontWeights.medium'}
      borderRadius={12}
      border="1px solid"
      borderColor={kindPreset[kind].bgColor ?? '#ff0000'}
      {...props}
    >
      {children}
    </Button>
  );
};

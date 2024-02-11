import { Button as BaseButton } from '@kuma-ui/core';
import { ButtonHTMLAttributes, ReactNode } from 'react';

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  children: ReactNode;
  kind: keyof typeof kindPreset;
};

const kindPreset = {
  text: {
    bgColor: 'transparent',
    textColor: 'colors.dark.900',
  },
  dark: {
    bgColor: 'colors.dark.900',
    textColor: '#fff',
  },
};

export const ContainedButton = ({ children, kind, ...props }: ButtonProps) => {
  return (
    <BaseButton
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
    </BaseButton>
  );
};

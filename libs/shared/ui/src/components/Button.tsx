import { VariantProps } from 'class-variance-authority';
import { cva } from 'class-variance-authority';
import { ButtonHTMLAttributes, ElementType, ReactNode } from 'react';

import { cn } from '../lib/utils';

const buttonVariants = cva(
  'inline-flex h-fit w-fit items-center justify-center rounded-xl border text-sm font-medium transition-all duration-200 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-dark-900/60 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 motion-reduce:transition-none',
  {
    variants: {
      variant: {
        base: '',
        contained: '',
        text: 'border-transparent bg-transparent shadow-none',
        shadow: 'shadow-button hover:shadow-button-hover',
      },
      size: {
        sm: 'px-3 py-2',
        md: 'px-3.5 py-2 sm:px-4 sm:py-2.5',
        lg: 'px-4 py-2.5 sm:px-5 sm:py-3',
      },
      color: {
        primary: '',
        secondary: '',
      },
      active: {
        true: '',
        false: '',
      },
    },
    compoundVariants: [
      {
        variant: 'base',
        color: 'primary',
        className: 'border-dark-900 bg-dark-900 text-white hover:bg-dark-800 hover:border-dark-800 active:bg-dark-900',
      },
      {
        variant: 'base',
        color: 'secondary',
        className: 'border-transparent bg-transparent text-dark-900 hover:bg-dark-100 active:bg-dark-150',
      },
      {
        variant: 'contained',
        color: 'primary',
        className: 'border-dark-900 bg-dark-900 text-white hover:bg-dark-800 hover:border-dark-800 active:bg-dark-900',
      },
      {
        variant: 'contained',
        color: 'secondary',
        className:
          'border-dark-200 bg-dark-100 text-dark-900 hover:bg-dark-150 hover:border-dark-300 active:bg-dark-200',
      },
      {
        variant: 'text',
        color: 'primary',
        className: 'text-dark-900 hover:bg-dark-100 active:bg-dark-150',
      },
      {
        variant: 'text',
        color: 'secondary',
        className: 'text-dark-900 hover:bg-dark-100 active:bg-dark-150',
      },
      {
        variant: 'text',
        active: true,
        className: 'bg-dark-100 hover:bg-dark-150 active:bg-dark-200',
      },
      {
        variant: 'shadow',
        color: 'primary',
        className:
          'border-dark-800 bg-dark-900 text-white shadow-button hover:bg-dark-800 hover:border-dark-700 hover:shadow-button-hover active:bg-dark-950',
      },
      {
        variant: 'shadow',
        color: 'secondary',
        className:
          'border-dark-200/80 bg-white text-dark-900 shadow-button hover:bg-surface-100 hover:border-dark-300 hover:shadow-button-hover active:bg-dark-100',
      },
    ],
    defaultVariants: {
      variant: 'base',
      size: 'md',
      color: 'primary',
      active: false,
    },
  }
);

type ButtonVariant = NonNullable<VariantProps<typeof buttonVariants>['variant']>;
type ButtonSize = NonNullable<VariantProps<typeof buttonVariants>['size']>;
type ButtonColor = NonNullable<VariantProps<typeof buttonVariants>['color']>;

export type ButtonKind = 'text' | 'textActive' | 'primary';

export type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  as?: ElementType;
  children?: ReactNode;
  href?: string;
  variant?: ButtonVariant;
  size?: ButtonSize;
  color?: ButtonColor;
  active?: boolean;
  isActive?: boolean;
  kind?: ButtonKind;
};

const buttonColorByVariant: Record<ButtonVariant, ButtonColor> = {
  base: 'primary',
  contained: 'primary',
  text: 'secondary',
  shadow: 'secondary',
};

function resolveButtonVariant(variant?: ButtonVariant, kind?: ButtonKind): ButtonVariant {
  if (variant) {
    return variant;
  }

  if (kind === 'text' || kind === 'textActive') {
    return 'text';
  }

  return 'base';
}

function resolveButtonColor(variant: ButtonVariant, color?: ButtonColor, kind?: ButtonKind): ButtonColor {
  if (color) {
    return color;
  }

  if (kind === 'primary') {
    return 'primary';
  }

  if (kind === 'text' || kind === 'textActive') {
    return 'secondary';
  }

  return buttonColorByVariant[variant];
}

function resolveButtonActive(active?: boolean, isActive?: boolean, kind?: ButtonKind): boolean {
  if (typeof active === 'boolean') {
    return active;
  }

  if (typeof isActive === 'boolean') {
    return isActive;
  }

  return kind === 'textActive';
}

export function Button({
  as,
  children,
  className,
  variant,
  size,
  color,
  active,
  isActive,
  kind,
  ...props
}: ButtonProps) {
  const Component = as ?? 'button';
  const resolvedVariant = resolveButtonVariant(variant, kind);
  const resolvedColor = resolveButtonColor(resolvedVariant, color, kind);
  const resolvedActive = resolveButtonActive(active, isActive, kind);

  return (
    <Component
      className={cn(
        buttonVariants({
          variant: resolvedVariant,
          size,
          color: resolvedColor,
          active: resolvedActive,
        }),
        className
      )}
      {...props}
    >
      {children}
    </Component>
  );
}

export { buttonVariants };
export type { ButtonColor, ButtonSize, ButtonVariant };

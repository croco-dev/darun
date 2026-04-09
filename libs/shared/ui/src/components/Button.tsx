import { VariantProps } from 'class-variance-authority';
import { cva } from 'class-variance-authority';
import { ButtonHTMLAttributes, ElementType, ReactNode } from 'react';

import { cn } from '../lib/utils';

const buttonVariants = cva(
  'inline-flex h-fit w-fit items-center justify-center rounded-xl border text-[14px] font-medium transition-colors duration-200 disabled:pointer-events-none disabled:opacity-50',
  {
    variants: {
      variant: {
        base: '',
        contained: '',
        text: 'border-transparent bg-transparent shadow-none',
        shadow: 'shadow-[0px_2px_8px_0px_rgba(0,0,0,0.08)]',
      },
      size: {
        sm: 'px-3 py-1.5',
        md: 'px-3 py-1.5 sm:px-3.5 sm:py-2',
        lg: 'px-4 py-2 sm:px-[18px] sm:py-2.5 text-[15px]',
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
        className: 'border-dark-900 bg-dark-900 text-white',
      },
      {
        variant: 'base',
        color: 'secondary',
        className: 'border-transparent bg-transparent text-dark-900',
      },
      {
        variant: 'contained',
        color: 'primary',
        className: 'border-dark-900 bg-dark-900 text-white',
      },
      {
        variant: 'contained',
        color: 'secondary',
        className: 'border-dark-100 bg-dark-100 text-dark-900',
      },
      {
        variant: 'text',
        color: 'primary',
        className: 'text-dark-900',
      },
      {
        variant: 'text',
        color: 'secondary',
        className: 'text-dark-900',
      },
      {
        variant: 'text',
        active: true,
        className: 'bg-dark-100',
      },
      {
        variant: 'shadow',
        color: 'primary',
        className: 'border-[rgba(0,0,0,0.1)] bg-dark-900 text-white',
      },
      {
        variant: 'shadow',
        color: 'secondary',
        className: 'border-[rgba(0,0,0,0.1)] bg-transparent text-dark-900',
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

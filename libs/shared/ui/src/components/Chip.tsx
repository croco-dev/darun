import { AnchorHTMLAttributes, ButtonHTMLAttributes, HTMLAttributes, ReactNode } from 'react';

import { cn } from '../lib/utils';

const chipVariants = {
  square: 'rounded-chip px-2 py-1 text-xs',
  circle: 'rounded-pill px-2.5 py-1 text-xs',
} as const;

const chipColors = {
  filledGray: 'border-transparent bg-surface-200 text-dark-700',
  filledDark: 'border-transparent bg-dark-900 text-dark-100',
  outlineGray: 'border-dark-150 bg-white text-dark-500',
  outlineBrown: 'border-brown-300 bg-transparent text-brown-900',
  outlineLeaf: 'border-leaf-300 bg-transparent text-leaf-900',
  outlineYellow: 'border-yellow-300 bg-transparent text-yellow-900',
  outlineCherry: 'border-cherry-300 bg-transparent text-cherry-900',
} as const;

type ChipVariant = keyof typeof chipVariants;
type ChipColor = keyof typeof chipColors;

type ChipCommonProps = {
  children: ReactNode;
  className?: string;
  variant?: ChipVariant;
  color?: ChipColor;
};

type DivChipProps = ChipCommonProps & HTMLAttributes<HTMLDivElement> & { as?: 'div' };
type AnchorChipProps = ChipCommonProps & AnchorHTMLAttributes<HTMLAnchorElement> & { as: 'a' };
type ButtonChipProps = ChipCommonProps & ButtonHTMLAttributes<HTMLButtonElement> & { as: 'button' };

export type ChipProps = DivChipProps | AnchorChipProps | ButtonChipProps;

export function Chip({
  as = 'div',
  children,
  className,
  color = 'filledGray',
  variant = 'square',
  ...props
}: ChipProps) {
  const chipClassName = cn(
    'inline-flex shrink-0 items-center border leading-none',
    chipVariants[variant],
    chipColors[color],
    as === 'button' && 'cursor-pointer',
    className
  );

  if (as === 'a') {
    const anchorProps = props as AnchorHTMLAttributes<HTMLAnchorElement>;

    return (
      <a className={chipClassName} {...anchorProps}>
        {children}
      </a>
    );
  }

  if (as === 'button') {
    const buttonProps = props as ButtonHTMLAttributes<HTMLButtonElement>;

    return (
      <button className={chipClassName} {...buttonProps}>
        {children}
      </button>
    );
  }

  const divProps = props as HTMLAttributes<HTMLDivElement>;

  return (
    <div className={chipClassName} {...divProps}>
      {children}
    </div>
  );
}

export type { ChipColor, ChipVariant };

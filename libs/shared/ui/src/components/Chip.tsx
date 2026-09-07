import { AnchorHTMLAttributes, ButtonHTMLAttributes, HTMLAttributes, ReactNode } from 'react';

import { cn } from '../lib/utils';

const chipVariants = {
  square: 'rounded-md px-2 py-0.5 text-xs font-medium tracking-tight',
  circle: 'rounded-full px-2.5 py-0.5 text-xs font-medium tracking-tight',
} as const;

const chipColors = {
  filledGray: 'border-transparent bg-surface-200 text-dark-800',
  filledDark: 'border-transparent bg-dark-900 text-dark-100',
  outlineGray: 'border-dark-150 bg-surface-100 text-dark-700',
  outlineBrown: 'border-brown-300 bg-brown-50/50 text-brown-900',
  outlineLeaf: 'border-leaf-300 bg-leaf-50/50 text-leaf-900',
  outlineYellow: 'border-yellow-300 bg-yellow-50/50 text-yellow-900',
  outlineCherry: 'border-cherry-300 bg-cherry-50/50 text-cherry-900',
} as const;

const chipHoverColors: Partial<Record<ChipColor, string>> = {
  filledGray: 'hover:bg-surface-300',
  filledDark: 'hover:bg-dark-800',
  outlineGray: 'hover:border-dark-300 hover:bg-surface-200',
  outlineBrown: 'hover:bg-brown-100',
  outlineLeaf: 'hover:bg-leaf-100',
  outlineYellow: 'hover:bg-yellow-100',
  outlineCherry: 'hover:bg-cherry-100',
};

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
    'inline-flex shrink-0 items-center border leading-none transition-colors duration-200 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-dark-900/60 focus-visible:ring-offset-2 motion-reduce:transition-none',
    chipVariants[variant],
    chipColors[color],
    as !== 'div' && chipHoverColors[color],
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

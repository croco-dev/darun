import {
  AnchorHTMLAttributes,
  ButtonHTMLAttributes,
  HTMLAttributes,
  ReactNode,
} from "react";

import { cn } from "../lib/utils";

const chipVariants = {
  square: "rounded-[4px] px-[5px] py-[3px] text-[12px]",
  circle: "rounded-2xl px-[8px] py-[4px] text-[12px]",
} as const;

const chipColors = {
  filledGray: "border-dark-100 bg-dark-100 text-dark-700",
  filledDark: "border-dark-900 bg-dark-900 text-dark-100",
  outlineGray: "border-[rgba(0,0,0,0.15)] bg-transparent text-dark-600",
  outlineBrown: "border-brown-300 bg-transparent text-brown-900",
  outlineLeaf: "border-leaf-300 bg-transparent text-leaf-900",
  outlineYellow: "border-yellow-300 bg-transparent text-yellow-900",
  outlineCherry: "border-cherry-300 bg-transparent text-cherry-900",
} as const;

type ChipVariant = keyof typeof chipVariants;
type ChipColor = keyof typeof chipColors;

type ChipCommonProps = {
  children: ReactNode;
  className?: string;
  variant?: ChipVariant;
  color?: ChipColor;
};

type DivChipProps = ChipCommonProps &
  HTMLAttributes<HTMLDivElement> & { as?: "div" };
type AnchorChipProps = ChipCommonProps &
  AnchorHTMLAttributes<HTMLAnchorElement> & { as: "a" };
type ButtonChipProps = ChipCommonProps &
  ButtonHTMLAttributes<HTMLButtonElement> & { as: "button" };

export type ChipProps = DivChipProps | AnchorChipProps | ButtonChipProps;

export function Chip({
  as = "div",
  children,
  className,
  color = "filledGray",
  variant = "square",
  ...props
}: ChipProps) {
  const chipClassName = cn(
    "inline-flex shrink-0 items-center border leading-none",
    chipVariants[variant],
    chipColors[color],
    as === "button" && "cursor-pointer",
    className,
  );

  if (as === "a") {
    const anchorProps = props as AnchorHTMLAttributes<HTMLAnchorElement>;

    return (
      <a className={chipClassName} {...anchorProps}>
        {children}
      </a>
    );
  }

  if (as === "button") {
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

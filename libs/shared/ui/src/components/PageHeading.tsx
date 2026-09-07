import { cva, VariantProps } from "class-variance-authority";
import { HTMLAttributes, ReactNode } from "react";

import { cn } from "../lib/utils";

const pageHeadingVariants = cva("flex flex-col", {
  variants: {
    size: {
      sm: "gap-1.5",
      lg: "gap-2.5",
    },
    align: {
      left: "items-start text-left",
      center: "items-center text-center",
    },
  },
  defaultVariants: {
    size: "lg",
    align: "left",
  },
});

export type PageHeadingProps = HTMLAttributes<HTMLHeadingElement> & {
  title: string;
  subtitle?: string;
  moreLink?: ReactNode;
  size?: VariantProps<typeof pageHeadingVariants>["size"];
  align?: VariantProps<typeof pageHeadingVariants>["align"];
};

export function PageHeading({
  title,
  subtitle,
  moreLink,
  size,
  align,
  className,
  ...props
}: PageHeadingProps) {
  return (
    <div
      className={cn(pageHeadingVariants({ size, align }), className)}
      {...props}
    >
      <div className="flex w-full items-start justify-between gap-4">
        <h1 className="text-2xl font-bold leading-tight tracking-tight text-dark-900 sm:text-3xl">
          {title}
        </h1>
        {moreLink && (
          <span className="inline-flex shrink-0 items-center">{moreLink}</span>
        )}
      </div>
      {subtitle && (
        <p className="max-w-2xl text-sm leading-relaxed text-dark-600 sm:text-base">
          {subtitle}
        </p>
      )}
    </div>
  );
}

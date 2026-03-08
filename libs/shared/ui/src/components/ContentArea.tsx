import { ElementType, HTMLAttributes, ReactNode } from "react";

import { cn } from "../lib/utils";

export type ContentAreaProps = HTMLAttributes<HTMLElement> & {
  children: ReactNode;
  as?: ElementType;
};

export function ContentArea({
  as,
  children,
  className,
  ...props
}: ContentAreaProps) {
  const Component = as ?? "section";

  return (
    <Component
      className={cn(
        "mx-auto box-border w-full max-w-[1120px] px-4 md:px-8",
        className,
      )}
      {...props}
    >
      {children}
    </Component>
  );
}

import { cva, VariantProps } from 'class-variance-authority';
import { HTMLAttributes, ReactNode } from 'react';

import { cn } from '../lib/utils';

const pageHeadingVariants = cva('flex flex-col', {
  variants: {
    size: {
      sm: 'gap-1.5',
      lg: 'gap-2.5',
    },
    align: {
      left: 'items-start text-left',
      center: 'items-center text-center',
    },
  },
  defaultVariants: {
    size: 'lg',
    align: 'left',
  },
});

export type PageHeadingProps = HTMLAttributes<HTMLHeadingElement> & {
  title: string;
  subtitle?: string;
  moreLink?: ReactNode;
  size?: VariantProps<typeof pageHeadingVariants>['size'];
  align?: VariantProps<typeof pageHeadingVariants>['align'];
};

export function PageHeading({
  title,
  subtitle,
  moreLink,
  size,
  align = 'left',
  className,
  ...props
}: PageHeadingProps) {
  const isCentered = align === 'center';
  const isSmall = size === 'sm';
  return (
    <div className={cn(pageHeadingVariants({ size, align }), className)} {...props}>
      <div
        className={cn(
          'flex w-full gap-4',
          isCentered ? 'items-center justify-center text-center' : 'items-start justify-between'
        )}
      >
        <h1
          className={cn(
            'break-keep font-extrabold leading-tight tracking-tight text-dark-900',
            isSmall ? 'text-2xl sm:text-3xl' : 'text-2xl sm:text-3xl md:text-4xl'
          )}
        >
          {title}
        </h1>
        {moreLink && <span className="inline-flex shrink-0 items-center">{moreLink}</span>}
      </div>
      {subtitle && (
        <p
          className={cn(
            'max-w-2xl break-keep text-sm leading-relaxed text-dark-600 sm:text-base',
            isCentered && 'mx-auto'
          )}
        >
          {subtitle}
        </p>
      )}
    </div>
  );
}

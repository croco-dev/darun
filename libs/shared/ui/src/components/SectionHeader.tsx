import { VariantProps } from 'class-variance-authority';
import { cva } from 'class-variance-authority';
import { HTMLAttributes, ReactNode } from 'react';

import { cn } from '../lib/utils';

const sectionHeaderVariants = cva('flex flex-col', {
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

export type SectionHeaderProps = HTMLAttributes<HTMLHeadingElement> & {
  title: string;
  subtitle?: string;
  moreLink?: ReactNode;
  size?: VariantProps<typeof sectionHeaderVariants>['size'];
  align?: VariantProps<typeof sectionHeaderVariants>['align'];
};

export function SectionHeader({
  title,
  subtitle,
  moreLink,
  size,
  align = 'left',
  className,
  ...props
}: SectionHeaderProps) {
  const isCentered = align === 'center';
  const isSmall = size === 'sm';
  return (
    <div className={cn(sectionHeaderVariants({ size, align }), className)} {...props}>
      <div
        className={cn(
          'flex w-full gap-4',
          isCentered ? 'items-center justify-center text-center' : 'items-center justify-between'
        )}
      >
        <h2
          className={cn(
            'break-keep font-extrabold leading-tight tracking-tight text-dark-900',
            isSmall ? 'text-lg sm:text-xl' : 'text-xl sm:text-2xl'
          )}
        >
          {title}
        </h2>
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

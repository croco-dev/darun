import { VariantProps } from 'class-variance-authority';
import { cva } from 'class-variance-authority';
import { HTMLAttributes, ReactNode } from 'react';

import { cn } from '../lib/utils';

const sectionHeaderVariants = cva('flex flex-col gap-2', {
  variants: {
    size: {
      sm: 'gap-1',
      lg: 'gap-2',
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

export function SectionHeader({ title, subtitle, moreLink, size, align, className, ...props }: SectionHeaderProps) {
  return (
    <div className={cn(sectionHeaderVariants({ size, align }), className)} {...props}>
      <div className="flex items-baseline gap-3">
        <h2 className="text-xl font-bold tracking-tight text-dark-900 sm:text-2xl">{title}</h2>
        {moreLink && <span className="ml-auto shrink-0">{moreLink}</span>}
      </div>
      {subtitle && <p className="text-sm leading-relaxed text-dark-500 sm:text-base">{subtitle}</p>}
    </div>
  );
}

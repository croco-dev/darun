import type { VariantProps } from 'class-variance-authority';
import { cva } from 'class-variance-authority';
import type { HTMLAttributes, ReactNode } from 'react';
import { cn } from '../lib/utils';
import { ContentArea } from './ContentArea';

const sectionWrapperVariants = cva('w-full', {
  variants: {
    background: {
      white: 'bg-white',
      subtle: 'bg-dark-50',
      dark: 'bg-dark-900',
    },
    spacing: {
      none: '',
      sm: 'py-8',
      md: 'py-12',
      lg: 'py-16',
    },
  },
  defaultVariants: {
    background: 'white',
    spacing: 'md',
  },
});

export type SectionWrapperProps = HTMLAttributes<HTMLElement> & {
  children: ReactNode;
  background?: VariantProps<typeof sectionWrapperVariants>['background'];
  spacing?: VariantProps<typeof sectionWrapperVariants>['spacing'];
};

export function SectionWrapper({ children, background, spacing, className, ...props }: SectionWrapperProps) {
  return (
    <section className={cn(sectionWrapperVariants({ background, spacing }), className)} {...props}>
      <ContentArea>{children}</ContentArea>
    </section>
  );
}

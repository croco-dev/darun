'use client';

import { Link } from '@darun/utils-router';
import { Banknote, Clapperboard, Code2, MessageSquare, PenTool, Workflow } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { ComponentType, SVGProps } from 'react';
import { SectionHeader, SectionWrapper } from '@darun/ui';

type CategoryIcon = ComponentType<SVGProps<SVGSVGElement>>;

type CategoryItem = {
  key: string;
  label: string;
  productCount: number;
  icon: CategoryIcon;
  query: string;
};

type CategoryNavigationSectionProps = {
  categories?: CategoryItem[];
};

const defaultCategories: CategoryItem[] = [
  {
    key: 'finance',
    label: '금융',
    productCount: 124,
    icon: Banknote,
    query: '금융',
  },
  {
    key: 'video',
    label: '영상',
    productCount: 96,
    icon: Clapperboard,
    query: '영상',
  },
  {
    key: 'productivity',
    label: '생산성',
    productCount: 142,
    icon: Workflow,
    query: '생산성',
  },
  {
    key: 'communication',
    label: '커뮤니케이션',
    productCount: 88,
    icon: MessageSquare,
    query: '커뮤니케이션',
  },
  {
    key: 'design',
    label: '디자인',
    productCount: 73,
    icon: PenTool,
    query: '디자인',
  },
  {
    key: 'development',
    label: '개발',
    productCount: 131,
    icon: Code2,
    query: '개발',
  },
];

export const CategoryNavigationSection = ({ categories = defaultCategories }: CategoryNavigationSectionProps) => {
  const t = useTranslations();
  const numberFormatter = new Intl.NumberFormat();

  return (
    <SectionWrapper background="subtle" spacing="md" className="home-motion">
      <div className="flex w-full flex-col gap-6">
        <SectionHeader
          title={t('home.category.title')}
          moreLink={
            <Link
              href="/search/product"
              className="inline-flex min-h-11 items-center text-sm font-semibold text-brand-700 transition-colors duration-200 ease-out hover:text-brand-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-300/80 focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--home-bg-section-alt)] motion-reduce:transition-none"
            >
              {t('home.category.more')}
            </Link>
          }
        />
        {categories.length > 0 ? (
          <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-4">
            {categories.map(({ key, label, productCount, icon: Icon }) => (
              <Link
                key={key}
                href={`/categories/${key}`}
                className="group flex min-h-[144px] flex-col justify-between rounded-[20px] border border-dark-100 bg-white p-4 shadow-[0px_1px_2px_rgba(15,23,42,0.04)] transition-all duration-200 ease-out hover:-translate-y-1 hover:border-brand-300 hover:shadow-[0px_18px_34px_rgba(15,23,42,0.1)] focus-visible:-translate-y-1 focus-visible:border-brand-300 focus-visible:shadow-[0px_18px_34px_rgba(15,23,42,0.1)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-300/70 focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--home-bg-section-alt)] active:translate-y-0 active:scale-[0.99] motion-reduce:transform-none motion-reduce:transition-none sm:p-5"
              >
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-brand-50 text-brand-700 transition-all duration-200 ease-out group-hover:bg-brand-100 group-hover:shadow-[0_10px_24px_-18px_rgba(53,63,174,0.45)] group-focus-visible:bg-brand-100 motion-reduce:transition-none">
                  <Icon
                    className="h-5 w-5 transition-transform duration-200 ease-out group-hover:scale-105 group-focus-visible:scale-105 motion-reduce:transform-none motion-reduce:transition-none"
                    aria-hidden="true"
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <span className="text-sm font-semibold tracking-tight text-dark-900 transition-colors duration-200 ease-out group-hover:text-brand-800 group-focus-visible:text-brand-800 motion-reduce:transition-none sm:text-base">
                    {label}
                  </span>
                  <span className="text-xs font-medium text-dark-500 tabular-nums sm:text-sm">
                    {numberFormatter.format(productCount)}
                  </span>
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <div className="flex min-h-[180px] items-center justify-center rounded-xl border border-dashed border-dark-200 bg-white px-6 py-10 text-center text-sm font-medium text-dark-500 sm:text-base">
            {t('home.category.empty')}
          </div>
        )}
      </div>
    </SectionWrapper>
  );
};

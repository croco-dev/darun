'use client';

import { Link } from '@darun/utils-router';
import {
  Banknote,
  Clapperboard,
  Code2,
  MessageSquare,
  PenTool,
  Workflow,
} from 'lucide-react';
import { useTranslations } from 'next-intl';
import type { ComponentType, SVGProps } from 'react';
import { SectionHeader } from '../../../../../shared/ui/src/components/SectionHeader';
import { SectionWrapper } from '../../../../../shared/ui/src/components/SectionWrapper';

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

export const CategoryNavigationSection = ({
  categories = defaultCategories,
}: CategoryNavigationSectionProps) => {
  const t = useTranslations();
  const numberFormatter = new Intl.NumberFormat();

  return (
    <SectionWrapper background="subtle" spacing="md">
      <div className="flex w-full flex-col gap-6">
        <SectionHeader
          title={t('home.category.title')}
          moreLink={
            <Link
              href="/search/product"
              className="text-sm font-semibold text-brand-700 transition-colors duration-200 hover:text-brand-800"
            >
              {t('home.category.more')}
            </Link>
          }
        />
        {categories.length > 0 ? (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6">
            {categories.map(
              ({ key, label, productCount, icon: Icon, query }) => (
                <Link
                  key={key}
                  href={{
                    pathname: '/search/product',
                    query: { query },
                  }}
                  className="group flex min-h-[132px] flex-col justify-between rounded-xl border border-dark-100 bg-white p-4 shadow-[0px_1px_2px_rgba(15,23,42,0.04)] transition-all duration-200 hover:-translate-y-0.5 hover:border-brand-200 hover:shadow-[0px_14px_30px_rgba(15,23,42,0.08)]"
                >
                  <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand-50 text-brand-700 transition-colors duration-200 group-hover:bg-brand-100">
                    <Icon className="h-5 w-5" aria-hidden="true" />
                  </div>
                  <div className="flex flex-col gap-1">
                    <span className="text-sm font-semibold tracking-tight text-dark-900 sm:text-base">
                      {label}
                    </span>
                    <span className="text-xs font-medium text-dark-500 tabular-nums sm:text-sm">
                      {numberFormatter.format(productCount)}
                    </span>
                  </div>
                </Link>
              ),
            )}
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

import { Metadata } from 'next';
import { CategoryCards, VisualHomeHero } from '../features/discover/VisualHomeHero';
import { ScreenshotExplorer } from '../features/screenshots';
import { VisualLayout } from './VisualLayout';

export type TrendingItem = {
  id: string;
  imageUrl: string;
  imageAlt: string;
  title: string | null;
  productName: string;
};

type Props = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export async function generateMetadata({ searchParams }: Props): Promise<Metadata> {
  const params = await searchParams;
  const screenTypeParam = params['screenType'];
  const screenType = typeof screenTypeParam === 'string' ? screenTypeParam : null;
  if (screenType === null) {
    return {};
  }
  return {
    title: `${screenType} 화면 모음 — 다른 Visual`,
    description: `한국 서비스의 ${screenType} 화면을 다른 Visual에서 모아보세요.`,
    alternates: { canonical: '/' },
  };
}

export default async function Page({ searchParams }: Props) {
  const params = await searchParams;
  const hasActiveFilter = ['q', 'platform', 'screenType', 'product'].some(key => {
    const value = params[key];
    return typeof value === 'string' && value.trim().length > 0;
  });

  return (
    <VisualLayout>
      <div className="w-full pt-6 pb-8 md:pt-10 md:pb-12">
        <div className="mx-auto flex w-full max-w-[1440px] flex-col gap-6 px-4 md:gap-6 md:px-6">
          {!hasActiveFilter && (
            <div className="flex flex-col gap-5">
              <VisualHomeHero />
              <CategoryCards />
            </div>
          )}
          <ScreenshotExplorer hideHero />
        </div>
      </div>
    </VisualLayout>
  );
}

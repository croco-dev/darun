import { Metadata } from 'next';
import { Suspense } from 'react';
import { ScreenshotExplorer } from '../features/screenshots';
import { VisualLayout } from './VisualLayout';

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

export default function Page() {
  return (
    <VisualLayout>
      <div className="mx-auto w-full max-w-[1440px] px-4 py-5 md:px-8 md:py-8">
        <Suspense fallback={<p className="py-12 text-sm text-dark-600">화면을 불러오는 중…</p>}>
          <ScreenshotExplorer />
        </Suspense>
      </div>
    </VisualLayout>
  );
}

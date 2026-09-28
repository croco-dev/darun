'use client';

import { MagazineInfoSection } from '@darun/magazines-shell';
import { Breadcrumb, ContentArea } from '@darun/ui';
import { Layout } from '@darun/ui-layout';
import { useLocale } from 'next-intl';

export const MagazineContentPage = ({
  params: { slug },
  title,
}: {
  params: { slug: string; locale?: string };
  title?: string;
}) => {
  const locale = useLocale();
  const isKo = locale === 'ko';

  return (
    <Layout>
      <main className="flex min-h-[calc(100vh-4rem)] w-full flex-col bg-gradient-to-b from-surface-50/60 via-white to-white">
        <ContentArea className="flex flex-col gap-6 pt-5 pb-12 sm:pt-6 sm:pb-16 md:gap-8 md:pt-8 md:pb-20">
          <Breadcrumb
            data-testid="breadcrumb-magazine"
            ariaLabel={isKo ? '탐색 경로' : 'Breadcrumb'}
            items={[
              { label: isKo ? '홈' : 'Home', href: `/${locale}` },
              { label: isKo ? '매거진' : 'Magazines', href: `/${locale}/magazines` },
              { label: title ?? slug, ariaCurrent: 'page' },
            ]}
          />
          <MagazineInfoSection slug={slug} />
        </ContentArea>
      </main>
    </Layout>
  );
};

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
      <main className="flex w-full flex-col">
        <ContentArea className="flex flex-col gap-6 py-6 md:gap-8 md:py-8">
          <Breadcrumb
            data-testid="breadcrumb-magazine"
            items={[
              { label: isKo ? '홈' : 'Home', href: `/${locale}` },
              { label: isKo ? '매거진' : 'Magazine' },
              { label: title ?? slug, ariaCurrent: 'page' },
            ]}
          />
          <MagazineInfoSection slug={slug} />
        </ContentArea>
      </main>
    </Layout>
  );
};

'use client';

import { FAQItem } from '@darun/products-shell';
import { AlternativeProductSection, FAQSection, ProductSummary } from '@darun/products-shell';
import { Breadcrumb, ContentArea } from '@darun/ui';
import { Layout } from '@darun/ui-layout';
import { useLocale } from 'next-intl';

export const ProductAlternativePage = ({
  params: { slug },
  productName,
  faqItems,
}: {
  params: { slug: string };
  productName: string;
  faqItems?: FAQItem[];
}) => {
  const locale = useLocale();
  const isKo = locale === 'ko';

  return (
    <Layout>
      <main className="flex w-full flex-col">
        <div className="relative overflow-hidden border-b border-dark-150/60 bg-gradient-to-b from-white via-surface-50 to-surface-100/40">
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -top-24 left-1/2 -z-0 h-96 w-96 -translate-x-1/2 rounded-full bg-gradient-to-tr from-brown-100/30 via-surface-200/40 to-transparent blur-3xl motion-reduce:hidden"
          />
          <ContentArea className="relative z-10 flex flex-col gap-4 pt-5 pb-6 sm:gap-5 sm:pt-6 sm:pb-7 md:pt-8 md:pb-8">
            <Breadcrumb
              data-testid="breadcrumb-alternatives"
              items={[
                { label: isKo ? '홈' : 'Home', href: `/${locale}` },
                { label: productName, href: `/${locale}/products/${slug}` },
                { label: isKo ? '대안 서비스' : 'Alternatives', ariaCurrent: 'page' },
              ]}
            />
            <ProductSummary slug={slug} infoLinkHref={`/${locale}/products/${slug}`} />
          </ContentArea>
        </div>
        <ContentArea className="flex flex-col gap-10 pt-6 pb-16 sm:gap-12 md:gap-14 md:pt-8 md:pb-24">
          <AlternativeProductSection slug={slug} />
          {faqItems && faqItems.length > 0 && <FAQSection items={faqItems} />}
        </ContentArea>
      </main>
    </Layout>
  );
};

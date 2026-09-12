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
        <ContentArea className="flex flex-col gap-6 py-6 md:gap-8 md:py-8">
          <Breadcrumb
            data-testid="breadcrumb-alternatives"
            items={[
              { label: isKo ? '홈' : 'Home', href: `/${locale}` },
              { label: productName, href: `/${locale}/products/${slug}` },
              { label: isKo ? '대안 서비스' : 'Alternatives', ariaCurrent: 'page' },
            ]}
          />
          <ProductSummary slug={slug} infoLinkHref={`/${locale}/products/${slug}`} />
          <AlternativeProductSection slug={slug} />
          {faqItems && faqItems.length > 0 && <FAQSection items={faqItems} />}
        </ContentArea>
      </main>
    </Layout>
  );
};

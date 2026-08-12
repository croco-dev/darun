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
  return (
    <Layout>
      <main className="flex w-full flex-col">
        <ContentArea className="flex flex-col gap-6 py-6 md:py-8">
          <Breadcrumb
            data-testid="breadcrumb-alternatives"
            items={[
              { label: '홈', href: `/${locale}/` },
              { label: productName, href: `/${locale}/products/${slug}` },
              { label: '대안', ariaCurrent: 'page' },
            ]}
          />
          <ProductSummary slug={slug} infoLinkHref={`/${locale}/products/${slug}`} />
        </ContentArea>
        <ContentArea className="flex flex-col gap-8 py-6 md:gap-12 md:py-8">
          <AlternativeProductSection slug={slug} />
          {faqItems && faqItems.length > 0 && <FAQSection items={faqItems} />}
        </ContentArea>
      </main>
    </Layout>
  );
};

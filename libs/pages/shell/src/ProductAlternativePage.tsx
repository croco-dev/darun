import { FAQItem } from '@darun/products-shell';
import { AlternativeProductSection, FAQSection, ProductSummary } from '@darun/products-shell';
import { Breadcrumb, ContentArea } from '@darun/ui';
import { Layout } from '@darun/ui-layout';
import { Link } from '@darun/utils-router';

export const ProductAlternativePage = ({
  params: { slug },
  productName,
  faqItems,
}: {
  params: { slug: string };
  productName: string;
  faqItems?: FAQItem[];
}) => {
  return (
    <Layout>
      <main className="flex w-full flex-col">
        <ContentArea className="flex flex-col gap-6 py-6 md:py-8">
          <Breadcrumb
            data-testid="breadcrumb-alternatives"
            items={[
              { label: '홈', href: '/ko/' },
              { label: productName, href: `/ko/products/${slug}` },
              { label: '대안', ariaCurrent: 'page' },
            ]}
          />
          <Link href={`/products/${slug}`}>
            <ProductSummary slug={slug} />
          </Link>
        </ContentArea>
        <ContentArea className="flex flex-col gap-8 py-6 md:gap-12 md:py-8">
          <AlternativeProductSection slug={slug} />
          {faqItems && faqItems.length > 0 && <FAQSection items={faqItems} />}
        </ContentArea>
      </main>
    </Layout>
  );
};

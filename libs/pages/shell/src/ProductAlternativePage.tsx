import { AlternativeProductSection, FAQItem, FAQSection, ProductSummary } from '@darun/products-shell';
import { ContentArea } from '@darun/ui';
import { Layout } from '@darun/ui-layout';
import { Link } from '@darun/utils-router';

export const ProductAlternativePage = ({
  params: { slug },
  faqItems,
}: {
  params: { slug: string };
  faqItems?: FAQItem[];
}) => (
  <Layout>
    <div className="flex flex-col">
      <main className="flex w-full flex-col">
        <div className="mb-1 flex flex-col gap-0.5">
          <ContentArea>
            <Link href={`/products/${slug}`}>
              <ProductSummary slug={slug} />
            </Link>
          </ContentArea>
        </div>
        <div className="my-0.5 flex h-px w-full bg-dark-100" />
        <ContentArea>
          <div className="flex flex-col py-3">
            <AlternativeProductSection slug={slug} />
          </div>
        </ContentArea>
        {faqItems && faqItems.length > 0 && (
          <ContentArea>
            <FAQSection items={faqItems} />
          </ContentArea>
        )}
      </main>
    </div>
  </Layout>
);

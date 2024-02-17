import { ContentArea } from '@darun/ui-foundation';
import { Layout } from '@darun/ui-layout';
import { ProductSummarySection } from '../products/shells/ProductSummarySection';

export const ProductDetailPage = ({ params: { slug } }: { params: { slug: string } }) => (
  <Layout>
    <ContentArea as="main">
      <ProductSummarySection slug={slug} />
    </ContentArea>
  </Layout>
);

import { ContentArea } from '@darun/ui-foundation';
import { Layout } from '@darun/ui-layout';

export const ProductDetailPage = ({ params: { slug } }: { params: { slug: string } }) => (
  <Layout>
    <ContentArea as="main">hello</ContentArea>
  </Layout>
);

import { IndexProductButton } from '@products/components';
import { AppShell } from '@uis';

export const ProductDetailPage = ({ params: { slug } }: { params: { slug: string } }) => (
  <AppShell>
    <IndexProductButton slug={slug} />
  </AppShell>
);

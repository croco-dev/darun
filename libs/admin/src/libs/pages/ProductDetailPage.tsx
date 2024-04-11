import { IndexProductButton } from '../products/components/IndexProductButton';
import { AppShell } from '../uis/AppShell';

export const ProductDetailPage = ({ params: { slug } }: { params: { slug: string } }) => (
  <AppShell>
    <IndexProductButton slug={slug} />
  </AppShell>
);

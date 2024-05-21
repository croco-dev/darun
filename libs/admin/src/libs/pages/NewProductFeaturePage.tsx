import { AppShell } from '@uis';
import { NewProductFeatureFormSection } from '../products/shells/NewProductFeatureFormSection';

export const NewProductFeaturePage = ({ params: { slug } }: { params: { slug: string } }) => (
  <AppShell>
    <NewProductFeatureFormSection productSlug={slug} />
  </AppShell>
);

import { NewProductScreenshotFormSection } from '@products/shells';
import { AppShell } from '@uis';

export const NewProductScreenshotPage = ({ params: { slug } }: { params: { slug: string } }) => (
  <AppShell>
    <NewProductScreenshotFormSection productSlug={slug} />
  </AppShell>
);

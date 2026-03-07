import { NewProductScreenshotPage } from '@darun/admin-pages-shell';

type PageProps = {
  params: Promise<{
    slug: string;
  }>;
};

export default async function Page({ params }: PageProps) {
  const { slug } = await params;

  return <NewProductScreenshotPage params={{ slug }} />;
}

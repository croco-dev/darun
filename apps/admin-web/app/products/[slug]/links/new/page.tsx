import { NewProductLinkPage } from '@darun/admin-pages-shell';

type PageProps = {
  params: Promise<{
    slug: string;
  }>;
};

export default async function Page({ params }: PageProps) {
  const { slug } = await params;

  return <NewProductLinkPage params={{ slug }} />;
}

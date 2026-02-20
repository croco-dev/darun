import { NewProductFeaturePage } from '@darun/admin';

type PageProps = {
  params: Promise<{
    slug: string;
  }>;
};

export default async function Page({ params }: PageProps) {
  const { slug } = await params;

  return <NewProductFeaturePage params={{ slug }} />;
}

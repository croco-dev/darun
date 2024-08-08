import { gql } from '@apollo/client';
import { ProductDetailPage } from '@darun/frontend';
import { getClient } from '@darun/utils-apollo-client/server';
import { Metadata } from 'next';
import { notFound } from 'next/navigation';

const productQuery = gql`
  query ProductBySlugOnProductDetailPageMetadata($slug: String!) {
    productBySlug(slug: $slug) {
      name
      tags {
        name
      }
    }
  }
`;

type Props = {
  params: { slug: string };
  searchParams: { [key: string]: string | string[] | undefined };
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { data } = await getClient().query<{ productBySlug?: { name: string; tags: { name: string }[] } }>({
    query: productQuery,
    variables: { slug: params.slug },
  });

  if (!data.productBySlug?.name) {
    return notFound();
  }

  const name = data.productBySlug.name;
  const tags = data.productBySlug.tags.map(tag => tag.name);

  return {
    title: `${name} - 다른(darun)`,
    openGraph: {
      title: `${name} - 다른(darun)`,
    },
    keywords: tags,
  };
}

export default ProductDetailPage;

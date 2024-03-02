import { gql } from '@apollo/client';
import { ProductDetailPage } from '@darun/frontend';
import { getClient } from '@darun/utils-apollo-client/server';
import { Metadata } from 'next';

const productQuery = gql`
  query ProductBySlugOnProductDetailPageMetadata($slug: String!) {
    productBySlug(slug: $slug) {
      name
    }
  }
`;

type Props = {
  params: { slug: string };
  searchParams: { [key: string]: string | string[] | undefined };
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { data } = await getClient().query<{ productBySlug?: { name: string } }>({
    query: productQuery,
    variables: { slug: params.slug },
  });

  const name = data.productBySlug?.name ?? '';

  return {
    title: `${name} - 다른(darun)`,
    openGraph: {
      title: `${name} - 다른(darun)`,
    },
  };
}

export default ProductDetailPage;

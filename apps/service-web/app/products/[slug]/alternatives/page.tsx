import { gql } from '@apollo/client';
import { ProductAlternativePage } from '@darun/frontend';
import { getClient } from '@darun/utils-apollo-client/server';
import { Metadata } from 'next';

const productQuery = gql`
  query ProductBySlugOnProductAlternativePageMetadata($slug: String!) {
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
    title: `${name}의 다른 서비스 - 다른(darun)`,
    openGraph: {
      title: `${name}의 다른 서비스 - 다른(darun)`,
    },
  };
}

export default ProductAlternativePage;

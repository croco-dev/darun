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
    description: `${name}의 다른 서비스를 찾아보세요. 다른(darun)에서는 ${name}과 비슷한 다양한 서비스들을 비교하고, 사용자들이 평가한 서비스들을 찾아볼 수 있습니다.`,
    keywords: [
      `${name} 비슷한 서비스`,
      `${name} 대안`,
      `${name} 비슷한 사이트`,
      `${name} 비슷한 앱`,
      `${name} 비슷한`,
      `${name} 말고`,
    ],
    openGraph: {
      title: `${name}의 다른 서비스 - 다른(darun)`,
    },
  };
}

export default ProductAlternativePage;

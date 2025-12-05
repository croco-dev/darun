import { gql } from '@apollo/client';
import { ProductAlternativePage } from '@darun/frontend';
import { getClient } from '@darun/utils-apollo-client/server';
import { Metadata } from 'next';
import { notFound } from 'next/navigation';

const productQuery = gql`
  query ProductBySlugOnProductAlternativePageMetadata($slug: String!) {
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

  const description = `${name}의 다른 서비스를 찾아보세요. 다른(darun)에서는 ${name}과 비슷한 다양한 서비스들을 비교하고, 사용자들이 평가한 서비스들을 찾아볼 수 있습니다.`;
  const pageTitle = `${name}의 다른 서비스 - 다른: 서비스 비교를 한 곳에서`;
  const canonicalUrl = `https://www.darun.io/products/${params.slug}/alternatives`;

  return {
    title: pageTitle,
    description,
    keywords: [
      `${name} 비슷한 서비스`,
      `${name} 장단점`,
      `${name} 장점`,
      `${name} 단점`,
      `${name} 비교`,
      `${name} 다른 서비스`,
      `${name} 말고 다른 사이트`,
      `${name} 다른 앱`,
      `${name} 대안`,
      `${name} 비슷한 사이트`,
      `${name} 비슷한 앱`,
      `${name} 비슷한`,
      `${name} 말고`,
      ...tags,
      ...tags.map(tag => `${tag} 비슷한`),
    ],
    alternates: {
      canonical: canonicalUrl,
    },
    openGraph: {
      title: pageTitle,
      description,
      url: canonicalUrl,
      siteName: '다른(darun)',
    },
    twitter: {
      card: 'summary_large_image',
      title: pageTitle,
      description,
    },
  };
}

export default ProductAlternativePage;

import { gql } from '@apollo/client';
import { OgDefaultFrame, useImageResponse } from '@darun/frontend';
import { getClient, initApolloClient } from '@darun/utils-apollo-client/server';
import { notFound } from 'next/navigation';
import { container } from '../../serverContainer';

initApolloClient(() => container.serverApolloClient);

const productQuery = gql`
  query ProductBySlugOnProductDetailPageOgImageMetadata($slug: String!) {
    productBySlug(slug: $slug) {
      id
      name
      summary
      logoUrl
    }
  }
`;

type Props = {
  params: { slug: string };
  searchParams: { [key: string]: string | string[] | undefined };
};

export default async function Image({ params }: Props) {
  const { data } = await getClient().query<{ productBySlug?: { name: string; summary?: string; logoUrl?: string } }>({
    query: productQuery,
    variables: { slug: params.slug },
  });

  if (!data.productBySlug?.name) {
    return notFound();
  }

  const name = data.productBySlug.name;
  const summary = data.productBySlug.summary;
  const logoUrl = data.productBySlug.logoUrl;

  return await useImageResponse(
    <OgDefaultFrame
      type={'service'}
      name={name}
      description={summary || '다른에서 더 많은 정보를 확인하세요.'}
      serviceLogoUrl={logoUrl}
    />
  );
}

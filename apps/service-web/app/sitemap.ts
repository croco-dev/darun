import { gql } from '@apollo/client';
import { getClient, initApolloClient } from '@darun/utils-apollo-client/server';
import { MetadataRoute } from 'next';
import { container } from './serverContainer';

initApolloClient(() => container.serverApolloClient);

const productQuery = gql`
  query GetPublishedProductsOnSitemap {
    recentProducts(first: 100) {
      slug
      updatedAt
    }
  }
`;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const { data } = await getClient({ static: true }).query<{ recentProducts: { slug: string; updatedAt: string }[] }>({
    query: productQuery,
  });

  return (data.recentProducts ?? []).map(product => ({
    url: `${container.baseUrl}/products/${product.slug}`,
    lastModified: product.updatedAt ?? new Date(),
  }));
}

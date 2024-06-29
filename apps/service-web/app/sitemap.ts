import { gql } from '@apollo/client';
import { getClient, initApolloClient } from '@darun/utils-apollo-client/server';
import { MetadataRoute } from 'next';
import { container } from './serverContainer';

initApolloClient(() => container.serverApolloClient);

const productQuery = gql`
  query GetPublishedProductsOnSitemap {
    recentProducts(first: 100) {
      name
      slug
      updatedAt
      alternatives {
        slug
      }
    }
  }
`;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const { data } = await getClient({ static: true }).query<{
    recentProducts: { slug: string; updatedAt: string; name: string }[];
  }>({
    query: productQuery,
  });

  return (data.recentProducts ?? []).flatMap(product => [
    {
      url: `${container.baseUrl}/products/${product.slug}`,
      lastModified: product.updatedAt ?? new Date(),
    },
    {
      url: `${container.baseUrl}/products/${product.slug}/alternatives`,
      lastModified: product.updatedAt ?? new Date(),
    },
    {
      url: `${container.baseUrl}/search/product?query=${product.slug}`,
      lastModified: product.updatedAt ?? new Date(),
    },
    {
      url: `${container.baseUrl}/search/product?query=${product.name}`,
      lastModified: product.updatedAt ?? new Date(),
    },
  ]);
}

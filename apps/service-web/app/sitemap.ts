import { gql } from '@apollo/client';
import { getClient } from '@darun/utils-apollo-client/server';
import { MetadataRoute } from 'next';
import { container } from './container';

const productQuery = gql`
  query GetPublishedProductsOnSitemap {
    recentProducts(first: 100) {
      slug
      updatedAt
    }
  }
`;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const { data } = await getClient().query<{ products: { slug: string; updatedAt: string }[] }>({
    query: productQuery,
  });

  return data.products.map(product => ({
    url: `${container.baseUrl}/products/${product.slug}`,
    lastModified: product.updatedAt ?? new Date(),
  }));
}

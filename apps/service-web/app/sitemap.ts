import { gql } from '@apollo/client';
import { MetadataRoute } from 'next';
import { getClient } from './getServerClient';
import { buildSitemapEntries, SitemapCategory, SitemapMagazine, SitemapProduct } from './sitemap-entries';

export const revalidate = 3600; // 1 hour

const publishedProductsQuery = gql`
  query PublishedProductsForSitemap($first: Int!, $after: String) {
    publishedProductsForSitemap(first: $first, after: $after) {
      id
      slug
      updatedAt
      publishedAt
      alternatives {
        slug
      }
    }
  }
`;

const categoriesQuery = gql`
  query CategoriesForSitemap($first: Int!, $locale: String!) {
    categories(first: $first, locale: $locale) {
      id
      slug
    }
  }
`;

const publishedMagazinesQuery = gql`
  query PublishedMagazinesForSitemap {
    publishedMagazines {
      id
      slug
      updatedAt
      publishedAt
    }
  }
`;

async function fetchAllPublishedProducts(): Promise<SitemapProduct[]> {
  try {
    const client = getClient({ static: true });
    const allProducts: SitemapProduct[] = [];
    let cursor: string | undefined = undefined;
    const pageSize = 100;
    let hasMore = true;

    while (hasMore) {
      const result = await client.query<{
        publishedProductsForSitemap: SitemapProduct[];
      }>({
        query: publishedProductsQuery,
        variables: { first: pageSize, after: cursor },
        fetchPolicy: 'no-cache',
      });

      const products: SitemapProduct[] = result.data?.publishedProductsForSitemap ?? [];
      allProducts.push(...products);

      if (products.length < pageSize) {
        hasMore = false;
      } else {
        cursor = products[products.length - 1].id;
      }
    }

    return allProducts;
  } catch (error) {
    console.warn('Failed to fetch published products for sitemap:', error);
    return [];
  }
}

async function fetchCategories(): Promise<SitemapCategory[]> {
  try {
    const client = getClient({ static: true });
    const { data } = await client.query<{
      categories: SitemapCategory[];
    }>({
      query: categoriesQuery,
      variables: { first: 1000, locale: 'ko' },
      fetchPolicy: 'no-cache',
    });
    return data?.categories ?? [];
  } catch (error) {
    console.warn('Failed to fetch categories for sitemap:', error);
    return [];
  }
}

async function fetchMagazines(): Promise<SitemapMagazine[]> {
  try {
    const client = getClient({ static: true });
    const { data } = await client.query<{
      publishedMagazines: SitemapMagazine[];
    }>({
      query: publishedMagazinesQuery,
      fetchPolicy: 'no-cache',
    });
    return data?.publishedMagazines ?? [];
  } catch (error) {
    console.warn('Failed to fetch magazines for sitemap:', error);
    return [];
  }
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  try {
    return await buildSitemapEntries({
      fetchProducts: fetchAllPublishedProducts,
      fetchCategories,
      fetchMagazines,
    });
  } catch (error) {
    console.warn('Failed to build sitemap entries:', error);
    return buildSitemapEntries({
      fetchProducts: async () => [],
      fetchCategories: async () => [],
      fetchMagazines: async () => [],
    });
  }
}

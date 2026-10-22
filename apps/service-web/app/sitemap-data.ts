import { gql } from '@apollo/client';
import { MetadataRoute } from 'next';
import { getClient } from './getServerClient';
import {
  buildSitemapEntries,
  partitionSitemapEntries,
  SitemapCategory,
  SitemapMagazine,
  SitemapProduct,
} from './sitemap-entries';

const publishedProductsQuery = gql`
  query PublishedProductsForSitemap($first: Int!, $after: String) {
    publishedProductsForSitemap(first: $first, after: $after) {
      id
      slug
      updatedAt
      publishedAt
      hasAlternatives
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

async function fetchProductPage(after?: string): Promise<SitemapProduct[]> {
  const { data } = await getClient({ static: true }).query<{ publishedProductsForSitemap: SitemapProduct[] }>({
    query: publishedProductsQuery,
    variables: { first: 100, after },
    fetchPolicy: 'no-cache',
  });
  if (!data?.publishedProductsForSitemap) throw new Error('Missing sitemap products');
  const products = data.publishedProductsForSitemap;
  let previous = after;
  if (products.length > 100) throw new Error('Sitemap page exceeded requested limit');
  for (const product of products) {
    if (!product.id || (previous && product.id >= previous)) throw new Error('Sitemap pagination did not advance');
    previous = product.id;
  }
  return products;
}

async function fetchCategories(): Promise<SitemapCategory[]> {
  const { data } = await getClient({ static: true }).query<{ categories: SitemapCategory[] }>({
    query: categoriesQuery,
    // GetCategories already reads every category before slicing.
    variables: { first: 2_147_483_647, locale: 'ko' },
    fetchPolicy: 'no-cache',
  });
  if (!data?.categories) throw new Error('Missing sitemap categories');
  return data.categories;
}

async function fetchMagazines(): Promise<SitemapMagazine[]> {
  const { data } = await getClient({ static: true }).query<{ publishedMagazines: SitemapMagazine[] }>({
    query: publishedMagazinesQuery,
    fetchPolicy: 'no-cache',
  });
  if (!data?.publishedMagazines) throw new Error('Missing sitemap magazines');
  return data.publishedMagazines;
}

async function getStaticPartitions() {
  return partitionSitemapEntries(
    await buildSitemapEntries({
      fetchProducts: async () => [],
      fetchCategories,
      fetchMagazines,
    })
  );
}

async function getProductPartitions(products: SitemapProduct[]) {
  return partitionSitemapEntries(
    await buildSitemapEntries({
      fetchProducts: async () => products,
      fetchCategories: async () => [],
      fetchMagazines: async () => [],
      includeFixedRoutes: false,
    })
  );
}

export async function discoverSitemapPartitions() {
  const ids = (await getStaticPartitions()).map((_, index) => ({ id: `static~${index}` }));
  let cursor: string | undefined;
  while (true) {
    const products = await fetchProductPage(cursor);
    if (products.length === 0) break;
    const partitions = await getProductPartitions(products);
    ids.push(...partitions.map((_, index) => ({ id: `${cursor ?? 'start'}~${index}` })));
    if (ids.length > 50_000) throw new Error('Sitemap index exceeds URL limit');
    if (products.length < 100) break;
    cursor = products[products.length - 1].id;
  }
  return ids;
}

export async function getSitemapPartition(value: string): Promise<MetadataRoute.Sitemap> {
  const match = /^(static|start|[0-9a-z-]+)~(0|[1-9]\d*)$/i.exec(value);
  if (!match) throw new Error('Invalid sitemap partition');
  const [, cursor, index] = match;
  const partitions =
    cursor === 'static'
      ? await getStaticPartitions()
      : await getProductPartitions(await fetchProductPage(cursor === 'start' ? undefined : cursor));
  const partition = partitions[Number(index)];
  if (!partition) throw new Error('Unknown sitemap partition');
  return partition;
}

import { gql } from '@apollo/client';
import { MetadataRoute } from 'next';
import { getClient } from './getServerClient';
import { container } from './serverContainer';
import { makeEntries } from './sitemap-entries';

export const revalidate = 3600; // 1 hour

const productQuery = gql`
  query GetPublishedProductsOnSitemap($locale: String!) {
    recentProducts(first: 100, locale: $locale) {
      name
      slug
      updatedAt
      alternatives {
        slug
      }
    }
  }
`;

const createProductSearchUrl = (locale: 'ko' | 'en', query: string) =>
  `${container.baseUrl}/${locale}/search/product?query=${encodeURIComponent(query)}`;

const baseUrl = container.baseUrl;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const entries: MetadataRoute.Sitemap = [];

  entries.push(...makeEntries(`${baseUrl}/ko`, `${baseUrl}/en`, new Date()));

  try {
    const { data } = await getClient({ static: true }).query<{
      recentProducts: { slug: string; updatedAt: string; name: string }[];
    }>({
      query: productQuery,
      variables: {
        locale: 'ko',
      },
    });

    for (const product of data.recentProducts ?? []) {
      const lastModified = product.updatedAt ? new Date(product.updatedAt) : new Date();
      const { slug, name } = product;

      entries.push(
        ...makeEntries(`${baseUrl}/ko/products/${slug}`, `${baseUrl}/en/products/${slug}`, lastModified),
        ...makeEntries(
          `${baseUrl}/ko/products/${slug}/alternatives`,
          `${baseUrl}/en/products/${slug}/alternatives`,
          lastModified
        ),
        ...makeEntries(createProductSearchUrl('ko', slug), createProductSearchUrl('en', slug), lastModified),
        ...makeEntries(createProductSearchUrl('ko', name), createProductSearchUrl('en', name), lastModified)
      );
    }
  } catch {
    return entries;
  }

  return entries;
}

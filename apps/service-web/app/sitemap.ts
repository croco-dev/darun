import { gql } from '@apollo/client';
import { MetadataRoute } from 'next';
import { getClient } from './getServerClient';
import { container } from './serverContainer';

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

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const entries: MetadataRoute.Sitemap = [];

  entries.push(
    {
      url: `${container.baseUrl}/ko`,
      lastModified: new Date(),
      alternates: {
        languages: {
          ko: `${container.baseUrl}/ko`,
          en: `${container.baseUrl}/en`,
          'x-default': `${container.baseUrl}/ko`,
        },
      },
    },
    {
      url: `${container.baseUrl}/en`,
      lastModified: new Date(),
      alternates: {
        languages: {
          ko: `${container.baseUrl}/ko`,
          en: `${container.baseUrl}/en`,
          'x-default': `${container.baseUrl}/ko`,
        },
      },
    }
  );

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
      const lastModified = product.updatedAt ?? new Date();

      entries.push({
        url: `${container.baseUrl}/ko/products/${product.slug}`,
        lastModified,
        alternates: {
          languages: {
            ko: `${container.baseUrl}/ko/products/${product.slug}`,
            en: `${container.baseUrl}/en/products/${product.slug}`,
            'x-default': `${container.baseUrl}/ko/products/${product.slug}`,
          },
        },
      });

      entries.push({
        url: `${container.baseUrl}/en/products/${product.slug}`,
        lastModified,
        alternates: {
          languages: {
            ko: `${container.baseUrl}/ko/products/${product.slug}`,
            en: `${container.baseUrl}/en/products/${product.slug}`,
            'x-default': `${container.baseUrl}/ko/products/${product.slug}`,
          },
        },
      });

      entries.push({
        url: `${container.baseUrl}/ko/products/${product.slug}/alternatives`,
        lastModified,
        alternates: {
          languages: {
            ko: `${container.baseUrl}/ko/products/${product.slug}/alternatives`,
            en: `${container.baseUrl}/en/products/${product.slug}/alternatives`,
            'x-default': `${container.baseUrl}/ko/products/${product.slug}/alternatives`,
          },
        },
      });

      entries.push({
        url: `${container.baseUrl}/en/products/${product.slug}/alternatives`,
        lastModified,
        alternates: {
          languages: {
            ko: `${container.baseUrl}/ko/products/${product.slug}/alternatives`,
            en: `${container.baseUrl}/en/products/${product.slug}/alternatives`,
            'x-default': `${container.baseUrl}/ko/products/${product.slug}/alternatives`,
          },
        },
      });

      entries.push({
        url: createProductSearchUrl('ko', product.slug),
        lastModified,
        alternates: {
          languages: {
            ko: createProductSearchUrl('ko', product.slug),
            en: createProductSearchUrl('en', product.slug),
            'x-default': createProductSearchUrl('ko', product.slug),
          },
        },
      });

      entries.push({
        url: createProductSearchUrl('en', product.slug),
        lastModified,
        alternates: {
          languages: {
            ko: createProductSearchUrl('ko', product.slug),
            en: createProductSearchUrl('en', product.slug),
            'x-default': createProductSearchUrl('ko', product.slug),
          },
        },
      });

      entries.push({
        url: createProductSearchUrl('ko', product.name),
        lastModified,
        alternates: {
          languages: {
            ko: createProductSearchUrl('ko', product.name),
            en: createProductSearchUrl('en', product.name),
            'x-default': createProductSearchUrl('ko', product.name),
          },
        },
      });

      entries.push({
        url: createProductSearchUrl('en', product.name),
        lastModified,
        alternates: {
          languages: {
            ko: createProductSearchUrl('ko', product.name),
            en: createProductSearchUrl('en', product.name),
            'x-default': createProductSearchUrl('ko', product.name),
          },
        },
      });
    }
  } catch {
    return entries;
  }

  return entries;
}

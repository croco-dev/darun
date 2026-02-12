import { gql } from '@apollo/client';
import { getClient, initApolloClient } from '@darun/utils-apollo-client/server';
import { MetadataRoute } from 'next';
import { container } from './serverContainer';

export const revalidate = 60 * 60; // 1 hour

initApolloClient(() => container.serverApolloClient);

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

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const { data } = await getClient({ static: true }).query<{
    recentProducts: { slug: string; updatedAt: string; name: string }[];
  }>({
    query: productQuery,
    variables: {
      locale: 'ko',
    },
  });

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
      url: `${container.baseUrl}/ko/search/product?query=${product.slug}`,
      lastModified,
      alternates: {
        languages: {
          ko: `${container.baseUrl}/ko/search/product?query=${product.slug}`,
          en: `${container.baseUrl}/en/search/product?query=${product.slug}`,
          'x-default': `${container.baseUrl}/ko/search/product?query=${product.slug}`,
        },
      },
    });

    entries.push({
      url: `${container.baseUrl}/en/search/product?query=${product.slug}`,
      lastModified,
      alternates: {
        languages: {
          ko: `${container.baseUrl}/ko/search/product?query=${product.slug}`,
          en: `${container.baseUrl}/en/search/product?query=${product.slug}`,
          'x-default': `${container.baseUrl}/ko/search/product?query=${product.slug}`,
        },
      },
    });

    entries.push({
      url: `${container.baseUrl}/ko/search/product?query=${product.name}`,
      lastModified,
      alternates: {
        languages: {
          ko: `${container.baseUrl}/ko/search/product?query=${product.name}`,
          en: `${container.baseUrl}/en/search/product?query=${product.name}`,
          'x-default': `${container.baseUrl}/ko/search/product?query=${product.name}`,
        },
      },
    });

    entries.push({
      url: `${container.baseUrl}/en/search/product?query=${product.name}`,
      lastModified,
      alternates: {
        languages: {
          ko: `${container.baseUrl}/ko/search/product?query=${product.name}`,
          en: `${container.baseUrl}/en/search/product?query=${product.name}`,
          'x-default': `${container.baseUrl}/ko/search/product?query=${product.name}`,
        },
      },
    });
  }

  return entries;
}

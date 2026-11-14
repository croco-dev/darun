import { gql } from '@apollo/client';
import { useQuery } from '@apollo/client/react';
import { GetPhotosOnProductPhotosDocument } from '@darun/provider-graphql';
import { useLocale } from 'next-intl';

void gql`
  query GetPhotosOnProductPhotos($slug: String!, $locale: String!) {
    productBySlug(slug: $slug, locale: $locale) {
      id
      screenshots {
        imageUrl
        imageAlt
      }
    }
  }
`;

type ProductPhotosProps = { slug: string };

export function useProductPhotos({ slug }: ProductPhotosProps) {
  const locale = useLocale();
  const { data, loading, error, refetch } = useQuery(GetPhotosOnProductPhotosDocument, {
    variables: { slug, locale },
  });
  return {
    loading,
    error,
    refetch,
    photos:
      data?.productBySlug?.screenshots?.map(screenshot => ({
        imageUrl: screenshot.imageUrl,
        imageAlt: screenshot.imageAlt,
      })) ?? [],
  };
}

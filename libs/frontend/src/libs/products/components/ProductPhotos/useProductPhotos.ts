import { gql } from '@apollo/client';
import { useLocale } from 'next-intl';
import { useGetPhotosOnProductPhotosSuspenseQuery } from './__generated__/useProductPhotos';

gql`
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
  const { data } = useGetPhotosOnProductPhotosSuspenseQuery({
    variables: { slug, locale },
  });
  return {
    photos: data?.productBySlug?.screenshots.map(screenshot => ({
      imageUrl: screenshot.imageUrl,
      imageAlt: screenshot.imageAlt,
    })),
  };
}

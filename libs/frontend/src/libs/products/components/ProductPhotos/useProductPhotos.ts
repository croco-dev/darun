import { gql } from '@apollo/client';
import { useGetPhotosOnProductPhotosSuspenseQuery } from './__generated__/useProductPhotos';

gql`
  query GetPhotosOnProductPhotos($slug: String!) {
    productBySlug(slug: $slug) {
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
  const { data } = useGetPhotosOnProductPhotosSuspenseQuery({ variables: { slug } });
  return {
    photos: data.productBySlug?.screenshots.map(screenshot => ({
      imageUrl: screenshot.imageUrl,
      imageAlt: screenshot.imageAlt,
    })),
  };
}

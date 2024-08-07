type ProductPhotosProps = { screenshots: { imageUrl: string; imageAlt: string }[] };

export function useProductPhotos({ screenshots }: ProductPhotosProps) {
  return { photos: screenshots };
}

"use client";

import { bind } from "@darun/utils-structure-react";
import Image from "next/image";
import { useTranslations } from "next-intl";
import Zoom from "react-medium-image-zoom";
import { useProductPhotos } from "./useProductPhotos";

import "react-medium-image-zoom/dist/styles.css";

type ProductPhotosViewProps = {
  photos: ReturnType<typeof useProductPhotos>["photos"];
};

export const ProductPhotos = bind(
  useProductPhotos,
  ({ photos }: ProductPhotosViewProps) => {
    const t = useTranslations("ProductDetail");

    if (!photos || photos.length === 0) {
      return (
        <div className="rounded-card-lg border border-dark-150 bg-surface-100 px-5 py-8 text-center">
          <p className="text-sm text-dark-500">{t("photo.empty")}</p>
        </div>
      );
    }
    return (
      <div className="overflow-hidden rounded-card-lg border border-dark-150 bg-white p-4 shadow-card md:p-5">
        {photos && (
          <div className="flex w-full gap-3 overflow-x-auto scrollbar-hide">
            {photos.map((photo) => (
              <div key={photo.imageUrl} className="shrink-0">
                <Zoom>
                  <Image
                    src={photo.imageUrl}
                    alt={photo.imageAlt}
                    width={600}
                    height={220}
                    className="h-[220px] w-auto rounded-lg border border-dark-150 object-contain"
                  />
                </Zoom>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  },
);

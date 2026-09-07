"use client";

import { bind } from "@darun/utils-structure-react";
import { FeatureItem } from "../../uis";
import { useProductFeatureList } from "./useProductFeatureList";

export const ProductFeatureList = bind(
  useProductFeatureList,
  ({ features }) => (
    <div className="flex flex-col gap-3.5">
      {features.map((feature) => (
        <FeatureItem
          key={feature.id}
          name={feature.name}
          emoji={feature.emoji || undefined}
          description={feature.summary ?? undefined}
          screenshots={feature.screenshots.map((item) => ({
            id: item.id,
            imageAlt: item.imageAlt,
            imageUrl: item.imageUrl,
          }))}
        />
      ))}
    </div>
  ),
);

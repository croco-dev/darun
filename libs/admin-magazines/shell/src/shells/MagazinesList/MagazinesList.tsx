"use client";

import { bind } from "@croco/utils-structure-react";
import { ArticleCard } from "../../components/ArticleCard";
import { useMagazinesList } from "./useMagazinesList";

export const MagazinesList = bind(useMagazinesList, ({ magazines }) => {
  return (
    <div className="flex flex-col gap-4">
      {magazines.map((item, i) => (
        <ArticleCard
          key={item.id}
          title={item.title}
          summary={item.summary ?? undefined}
          author={item.author?.name}
          category={item.publishedAt ? "발행" : "미발행"}
          date={
            item.publishedAt
              ? new Date(item.publishedAt)
              : new Date(item.updatedAt)
          }
          thumbnailImageUri={item.backgroundImageUrl}
        />
      ))}
    </div>
  );
});

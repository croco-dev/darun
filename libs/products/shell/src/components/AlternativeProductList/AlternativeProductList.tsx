"use client";

import { bind } from "@croco/utils-structure-react";
import { Link } from "@darun/utils-router";
import { ProductItem } from "../../uis";
import { useAlternativeProductList } from "./useAlternativeProductList";

export const AlternativeProductList = bind(
  useAlternativeProductList,
  ({ alternatives }) => {
    return alternatives.length > 0 ? (
      <div className="grid w-full grid-cols-1 gap-5 md:grid-cols-2">
        {alternatives.map((alternative) => (
          <Link key={alternative.id} href={`/products/${alternative.slug}`}>
            <ProductItem
              name={alternative.name}
              logoUrl={alternative.logoUrl}
              logoSize={"medium"}
              summary={alternative.summary}
              tags={alternative.tags.map((tag) => tag.name)}
            />
          </Link>
        ))}
      </div>
    ) : null;
  },
);

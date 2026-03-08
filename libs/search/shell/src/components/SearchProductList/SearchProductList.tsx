"use client";

import { bind } from "@croco/utils-structure-react";
import { ProductFeatureGridList, ProductItem } from "@darun/products-shell";
import { Link } from "@darun/utils-router";
import { useTranslations } from "next-intl";
import { useSearchProductList } from "./useSearchProductList";

type SearchProductListViewProps = {
  products: NonNullable<ReturnType<typeof useSearchProductList>["products"]>;
};

export const SearchProductList = bind(
  useSearchProductList,
  ({ products }: SearchProductListViewProps) => {
    const t = useTranslations("Search");

    if (products.length === 0)
      return (
        <div className="flex flex-col gap-2 py-12">
          <p className="text-center text-[20px] font-semibold text-dark-800">
            {t("list.empty.title")}
          </p>
          <p className="text-center text-[14px] font-medium text-dark-600">
            {t("list.empty.description")}
          </p>
        </div>
      );
    return (
      <div className="flex flex-col gap-5">
        {products.map((product) => (
          <Link href={`/products/${product.slug}`} key={product.id}>
            <div className="bg-white rounded-[8px] border border-[rgba(0,0,0,0.12)] px-[18px] py-4 shadow-[0px_2px_8px_0px_rgba(0,0,0,0.04)] transition-all duration-200 ease-in-out hover:border-[rgba(0,0,0,0.14)] hover:shadow-[0px_4px_8px_2px_rgba(0,0,0,0.08)]">
              <div className="flex w-full flex-col gap-3">
                <div className="flex flex-row">
                  <ProductItem
                    name={product.name}
                    summary={product.summary}
                    logoSize={"small"}
                    logoUrl={product.logoUrl}
                    tagVariant={"circle"}
                    tags={product.tags.map((tag) => tag.name)}
                    maxTagItems={2}
                  />
                </div>
                <div className="my-[2px] h-px w-full bg-dark-100" />
                <div className="flex flex-col gap-6">
                  {product.features && product.features.length > 0 && (
                    <>
                      <div className="flex flex-col gap-3">
                        <div className="flex w-fit flex-col gap-1">
                          <p className="text-[16px] font-bold tracking-[-0.024em] text-dark-500">
                            {t("list.feature.title")}
                          </p>
                          <div className="h-[2px] bg-dark-400" />
                        </div>
                        <ProductFeatureGridList
                          features={product.features.map((item) => ({
                            ...item,
                            summary: item.summary ?? undefined,
                          }))}
                        />
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>
          </Link>
        ))}
      </div>
    );
  },
);

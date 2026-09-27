"use client";

import { useLocale } from "next-intl";
import { ProductLinks } from "../../components";

type ProductSummaryLinkProps = { slug: string };

export const ProductSummaryLink = ({ slug }: ProductSummaryLinkProps) => {
  const locale = useLocale();

  return (
    <div
      role="group"
      aria-label={locale === "ko" ? "공식 링크" : "Official links"}
      className="flex flex-wrap items-center gap-2.5 empty:hidden"
    >
      <ProductLinks slug={slug} />
    </div>
  );
};

"use client";

import { ProductTagsForm } from "@darun/admin-products-shell";
import {
  ProductDetailInfoSection,
  ProductDetailDescriptionSection,
  ProductDetailLinkSection,
} from "@darun/admin-products-shell";
import { ProductDetailAlternativeSection } from "@darun/admin-products-shell";
import { ProductDetailCompanySection } from "@darun/admin-products-shell";
import { ProductDetailFeatureSection } from "@darun/admin-products-shell";
import Link from "next/link";
import { AppShell, PageShell } from "../uis";

export const ProductDetailPage = ({
  params: { slug },
}: {
  params: { slug: string };
}) => (
  <AppShell>
    <PageShell title={"서비스 상세"}>
      <ProductDetailInfoSection slug={slug} />
      <div className="flex flex-col gap-8">
        <ProductDetailDescriptionSection slug={slug} />
        <ProductDetailFeatureSection slug={slug} />
        <ProductDetailLinkSection slug={slug} />
        <div className="flex flex-col gap-2">
          <div className="flex justify-between items-center">
            <h3 className="text-xl font-semibold">스크린샷 관리</h3>
            <Link href={`/products/${slug}/screenshots/new`}>
              <button className="bg-gray-900 text-white px-4 py-2 rounded-md hover:bg-gray-800">
                스크린샷 추가
              </button>
            </Link>
          </div>
          <div className="border border-gray-200 shadow-sm rounded-lg">
            <div className="border-b border-gray-200 px-4 py-2">미완</div>
          </div>
        </div>
        <ProductDetailAlternativeSection slug={slug} />
        <div className="flex flex-col gap-2">
          <h3 className="text-xl font-semibold">태그 관리</h3>
          <ProductTagsForm slug={slug} />
        </div>
        <ProductDetailCompanySection slug={slug} />
      </div>
    </PageShell>
  </AppShell>
);

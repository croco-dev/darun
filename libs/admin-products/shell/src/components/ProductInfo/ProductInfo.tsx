"use client";

import { bind } from "@croco/utils-structure-react";
import Image from "next/image";
import { useProductInfo } from "./useProductInfo";

export const ProductInfo = bind(
  useProductInfo,
  ({ name, logoUrl, summary, slug }) => (
    <div className="flex items-start gap-3">
      {logoUrl && (
        <Image
          src={logoUrl}
          unoptimized={!logoUrl}
          alt={`${name} 서비스 로고`}
          width={64}
          height={64}
          style={{
            objectFit: "contain",
            borderRadius: 12,
            border: "1px solid rgba(0, 0, 0, 0.15)",
          }}
        />
      )}
      <div className="flex flex-col gap-1">
        <div className="flex flex-col gap-px">
          <h2 className="text-2xl font-semibold text-dark-900">{name}</h2>
          <p className="text-sm text-black/60">{summary}</p>
        </div>
        {slug && (
          <code className="inline-flex w-fit rounded-md bg-black/5 px-2 py-1 text-sm font-bold text-dark-900">
            {slug}
          </code>
        )}
      </div>
    </div>
  ),
);

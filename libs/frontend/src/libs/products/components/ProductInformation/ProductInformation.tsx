"use client";

import { bind } from "@croco/utils-structure-react";
import { Product } from "@products/uis";
import { useProductInformation } from "./useProductInformation";

export const ProductInformation = bind(
  useProductInformation,
  ({ name, logoUrl, summary }) => (
    <Product name={name ?? ""} logoUrl={logoUrl} summary={summary} />
  ),
);

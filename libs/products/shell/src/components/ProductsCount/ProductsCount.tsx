"use client";

import { bind } from "@croco/utils-structure-react";
import { useProductsCount } from "./useProductsCount";

export const ProductsCount = bind(useProductsCount, ({ count }) => (
  <span className="text-brown-600">{count}</span>
));

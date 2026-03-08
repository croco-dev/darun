import { bind } from "@croco/utils-structure-react";
import { useProductDescription } from "./useProductDescription";

export const ProductDescription = bind(
  useProductDescription,
  ({ description }) => (
    <>
      {description ? (
        // eslint-disable-next-line react-dom/no-dangerously-set-innerhtml
        <div
          className="whitespace-pre-wrap text-sm leading-6 text-dark-900"
          dangerouslySetInnerHTML={{ __html: description }}
        ></div>
      ) : (
        <p className="text-xs text-black/60">설명이 없습니다.</p>
      )}
    </>
  ),
);

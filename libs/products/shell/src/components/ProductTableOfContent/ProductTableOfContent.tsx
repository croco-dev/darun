"use client";

import { bind } from "@croco/utils-structure-react";
import { TextButton } from "@darun/ui-foundation";

import { useProductTableOfContent } from "./useProductTableOfContent";

export const ProductTableOfContent = bind(
  useProductTableOfContent,
  ({ headings, activeHeadingId }) => (
    <div className="flex gap-0.5 overflow-x-auto py-2 md:gap-1">
      {headings.map(({ id, text }) => (
        <TextButton
          key={id}
          isActive={activeHeadingId === id}
          onClick={() => {
            const target = document.getElementById(id);

            if (!target) {
              return;
            }

            const location =
              target.getBoundingClientRect().top + window.scrollY - 40;
            window.scrollTo({ top: Math.max(location, 0), behavior: "smooth" });
          }}
        >
          {text}
        </TextButton>
      ))}
    </div>
  ),
);

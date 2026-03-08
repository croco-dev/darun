"use client";

import { bind } from "@croco/utils-structure-react";
import { Button } from "@darun/ui";

import { useProductTableOfContent } from "./useProductTableOfContent";

export const ProductTableOfContent = bind(
  useProductTableOfContent,
  ({ headings, activeHeadingId }) => (
    <div className="flex gap-0.5 overflow-x-auto py-2 md:gap-1">
      {headings.map(({ id, text }) => (
        <Button
          key={id}
          kind={activeHeadingId === id ? "textActive" : "text"}
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
        </Button>
      ))}
    </div>
  ),
);

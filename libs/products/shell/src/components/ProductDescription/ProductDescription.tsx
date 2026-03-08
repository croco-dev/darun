"use client";

import { bind } from "@croco/utils-structure-react";
import { createElement, type ReactNode, useMemo } from "react";
import { useProductDescription } from "./useProductDescription";

export const ProductDescription = bind(
  useProductDescription,
  ({ description }) => {
    const content = useMemo(
      () => createDescriptionContent(description),
      [description],
    );

    return (
      <div>
        <div className="[&_blockquote]:my-3 [&_blockquote]:flex [&_blockquote]:flex-row [&_blockquote]:items-center [&_blockquote]:gap-3 [&_blockquote]:rounded-[12px] [&_blockquote]:border [&_blockquote]:border-[rgba(0,0,0,0.05)] [&_blockquote]:bg-[#f6f6f6] [&_blockquote]:px-4 [&_blockquote]:py-[10px] [&_blockquote]:text-[15px] [&_blockquote_div]:flex [&_blockquote_div_svg]:h-7 [&_blockquote_div_svg]:w-7 [&_code]:mx-0.5 [&_code]:rounded [&_code]:bg-[#f7f7f7] [&_code]:px-1 [&_code]:py-0.5 [&_code]:text-[95%] [&_h1]:mb-2 [&_h1]:mt-5 [&_h1]:text-[20px] [&_h1]:font-semibold [&_h2]:mb-2 [&_h2]:mt-5 [&_h2]:text-[18px] [&_h2]:font-semibold [&_h3]:mb-2 [&_h3]:mt-5 [&_h3]:text-[16px] [&_h3]:font-semibold [&_hr]:my-4 [&_hr]:border-0 [&_hr]:border-t [&_hr]:border-[#e5e5e5] [&_ol]:pl-4 [&_p]:my-1 [&_ul]:pl-4 [&_.blank]:h-1 whitespace-pre-wrap break-words text-dark-800 leading-[1.5] [word-break:auto-phrase]">
          {content}
        </div>
      </div>
    );
  },
);

function createDescriptionContent(description: string) {
  if (typeof window === "undefined") {
    return null;
  }

  const parser = new DOMParser();
  const document = parser.parseFromString(description, "text/html");

  document.querySelectorAll("p").forEach((paragraph) => {
    if (paragraph.innerHTML.trim() === "") {
      paragraph.classList.add("blank");
    }
  });

  document.querySelectorAll("blockquote").forEach((blockquote) => {
    const iconWrapper = document.createElement("div");
    iconWrapper.innerHTML =
      '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24"><path fill="currentColor" d="m10 7l-2 4h3v6H5v-6l2-4zm8 0l-2 4h3v6h-6v-6l2-4z"/></svg>';
    blockquote.prepend(iconWrapper);
  });

  return renderNodes(Array.from(document.body.childNodes));
}

function renderNodes(nodes: ChildNode[]) {
  return nodes.map((node, index) => renderNode(node, `node-${index}`));
}

function renderNode(node: ChildNode, key: string): ReactNode {
  if (node.nodeType === Node.TEXT_NODE) {
    return node.textContent;
  }

  if (!(node instanceof HTMLElement)) {
    return null;
  }

  const tagName = node.tagName.toLowerCase();
  const children = renderNodes(Array.from(node.childNodes));
  const className = node.getAttribute("class") ?? undefined;

  if (tagName === "hr") {
    return <hr key={key} className={className} />;
  }

  return createElement(tagName, { key, className }, children);
}

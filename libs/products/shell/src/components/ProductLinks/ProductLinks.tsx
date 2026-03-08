"use client";

import { bind } from "@croco/utils-structure-react";
import { ShadowButton } from "@darun/ui-foundation";
import Image from "next/image";
import Link from "next/link";
import { useProductLinks } from "./useProductLinks";

export const ProductLinks = bind(useProductLinks, ({ links }) => (
  <>
    {links.map((link, index) => (
      <Link
        key={link.id}
        href={link.link}
        target="_blank"
        rel="noopener noreferrer"
      >
        <ShadowButton kind={index === 0 ? "primary" : "text"}>
          <div className="flex items-center justify-center gap-2 px-0.5 py-0.5">
            <Image src={link.iconUrl} alt={link.title} width={24} height={24} />
            <div className="flex flex-col items-start gap-0.5">
              <span
                className={`w-max break-keep text-[15px] font-medium ${index === 0 ? "" : "text-dark-900"}`}
              >
                {link.title}
              </span>
              <span
                className={`break-keep text-[13px] font-medium ${index === 0 ? "text-dark-200" : "text-dark-400"}`}
              >
                {link.displayLink}
              </span>
            </div>
          </div>
        </ShadowButton>
      </Link>
    ))}
  </>
));

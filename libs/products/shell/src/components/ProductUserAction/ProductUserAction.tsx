"use client";

import { bind } from "@croco/utils-structure-react";
import { ShadowButton } from "@darun/ui-foundation";
import { HeartIcon } from "@darun/ui-icons";
import { useProductUserAction } from "./useProductUserAction";

export const ProductUserAction = bind(
  useProductUserAction,
  ({ voteCount, upvoteProduct }) => (
    <div className="flex gap-1">
      <ShadowButton onClick={upvoteProduct}>
        <div className="flex flex-col items-center justify-center gap-1 px-0.5 py-0.5">
          <HeartIcon size={18} color={"#555"} />
          <span className="break-keep text-sm font-medium text-dark-700">
            {voteCount}
          </span>
        </div>
      </ShadowButton>
    </div>
  ),
);

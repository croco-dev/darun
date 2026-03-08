"use client";

import { bind } from "@croco/utils-structure-react";
import { SearchIcon } from "@darun/ui-icons";
import { ChangeEvent } from "react";
import { useHeaderSearchForm } from "./useHeaderSearchForm";

export const HeaderSearchForm = bind(
  useHeaderSearchForm,
  ({ query, setQuery, onSubmit }) => (
    <form
      className="flex min-w-0 flex-1 items-center gap-2 rounded-[14px] border border-solid border-black/15 px-4 py-[11px] shadow-[0px_2px_4px_0px_rgba(0,0,0,0.08)]"
      onSubmit={onSubmit}
    >
      <SearchIcon size={18} aria-hidden="true" />
      <input
        aria-label="검색어"
        type={"text"}
        placeholder="현재 사용 중인 서비스를 찾아보세요!"
        className="w-full border-none bg-transparent text-base tracking-[-0.1px] text-[#555] outline-none placeholder:text-[#555]"
        value={query}
        onChange={(e: ChangeEvent<HTMLInputElement>) =>
          setQuery(e.target.value)
        }
      />
    </form>
  ),
);

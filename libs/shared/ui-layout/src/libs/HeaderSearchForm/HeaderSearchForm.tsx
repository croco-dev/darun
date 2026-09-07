"use client";

import { Search, X } from "@darun/ui";
import { bind } from "@darun/utils-structure-react";
import { useTranslations } from "next-intl";
import { ChangeEvent } from "react";
import { useHeaderSearchForm } from "./useHeaderSearchForm";

export const HeaderSearchForm = bind(
  useHeaderSearchForm,
  ({ query, setQuery, onSubmit }) => {
    const t = useTranslations("Layout.header");

    return (
      <form
        className="flex min-w-0 flex-1 items-center gap-2 rounded-search border border-solid border-dark-200 bg-white px-3.5 py-2 shadow-button transition-all duration-200 ease-out focus-within:border-dark-900 focus-within:ring-2 focus-within:ring-dark-900/10 focus-within:shadow-button-hover motion-reduce:transition-none"
        onSubmit={onSubmit}
      >
        <Search
          size={18}
          className="shrink-0 text-dark-400"
          aria-hidden="true"
        />
        <input
          aria-label={t("searchAriaLabel")}
          type="text"
          placeholder={t("searchPlaceholder")}
          className="w-full border-none bg-transparent text-sm tracking-tight text-dark-900 outline-none placeholder:text-dark-500 focus-visible:outline-none md:text-base"
          value={query}
          onChange={(e: ChangeEvent<HTMLInputElement>) =>
            setQuery(e.target.value)
          }
        />
        {query ? (
          <button
            type="button"
            onClick={() => setQuery("")}
            className="shrink-0 rounded-full p-0.5 text-dark-400 hover:bg-surface-200 hover:text-dark-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-dark-900/60"
            aria-label="검색어 지우기"
          >
            <X size={14} />
          </button>
        ) : (
          <kbd
            aria-hidden="true"
            className="hidden select-none items-center rounded border border-dark-200 bg-surface-100 px-1.5 py-0.5 text-2xs font-semibold text-dark-400 font-mono shadow-2xs sm:inline-flex"
          >
            ⌘K
          </kbd>
        )}
      </form>
    );
  },
);

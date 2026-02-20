import { useNavigate, usePathname, useSearchParams } from "@darun/utils-router";
import { useEffect, useMemo, useState } from "react";
import { routing } from "../../i18n/routing";

type SubmitEventLike = {
  preventDefault: () => void;
};

type Locale = (typeof routing.locales)[number];

function isLocale(segment: string): segment is Locale {
  return routing.locales.some((locale) => locale === segment);
}

function resolveSearchPath(pathname: string | null): string {
  if (!pathname) {
    return "/search/product";
  }

  const segments = pathname.split("/").filter(Boolean);
  const localePrefix = segments[0];

  if (!localePrefix || !isLocale(localePrefix)) {
    return "/search/product";
  }

  return `/${localePrefix}/search/product`;
}

export function useHeaderSearchForm() {
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const navigate = useNavigate();
  const searchPath = useMemo(() => resolveSearchPath(pathname), [pathname]);
  const queryFromSearchParam = searchParams.get("query") ?? "";
  const [query, setQuery] = useState(queryFromSearchParam);

  useEffect(() => {
    setQuery(queryFromSearchParam);
  }, [queryFromSearchParam]);

  const onSubmit = (e: SubmitEventLike) => {
    e.preventDefault();
    const normalizedQuery = query.trim();

    if (!normalizedQuery) {
      navigate(searchPath);
      return;
    }

    navigate(`${searchPath}?query=${encodeURIComponent(normalizedQuery)}`);
  };

  return { query, setQuery, onSubmit };
}

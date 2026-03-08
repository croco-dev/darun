"use client";

import { ContentArea } from "@darun/ui-foundation";
import { Layout } from "@darun/ui-layout";
import { useTranslations } from "next-intl";
import { SearchProductResult } from "@darun/search-shell";

type Props = { searchParams: { [key: string]: string | string[] | undefined } };

function getNormalizedQuery(query: string | string[] | undefined): string {
  if (!query) {
    return "";
  }

  const resolvedQuery = Array.isArray(query)
    ? query.find(Boolean) ?? ""
    : query;
  return resolvedQuery.trim();
}

export function SearchProductPage({ searchParams }: Props) {
  const t = useTranslations("Search");
  const query = getNormalizedQuery(searchParams.query);

  if (!query) {
    return (
      <Layout>
        <main className="flex w-full flex-col py-8">
          <ContentArea>
            <div className="flex flex-col gap-3">
              <p className="text-center text-[22px] font-semibold tracking-[-0.2px] text-dark-800">
                {t("page.empty.title")}
              </p>
              <p className="text-center text-base font-medium text-dark-500">
                {t("page.empty.description")}
              </p>
            </div>
          </ContentArea>
        </main>
      </Layout>
    );
  }

  return (
    <Layout>
      <main className="flex w-full flex-col py-5">
        <ContentArea>
          <div className="flex flex-col gap-5">
            <p className="text-[22px] font-semibold tracking-[-0.2px]">
              {t("page.resultTitle", { query })}
            </p>
            <SearchProductResult query={query} />
          </div>
        </ContentArea>
      </main>
    </Layout>
  );
}

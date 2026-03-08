import { ProductListRefreshButton } from "@darun/admin-products-shell";
import { ProductListSection } from "@darun/admin-products-shell";
import { Link } from "@darun/utils-router";
import { Plus } from "lucide-react";
import { AppShell, PageShell } from "../uis";

export const ProductListPage = () => {
  return (
    <AppShell>
      <PageShell
        title={"서비스 목록"}
        rightSide={
          <div className="flex gap-2">
            <ProductListRefreshButton />
            <Link href="/products/new">
              <button className="flex items-center gap-2 bg-gray-900 text-white px-4 py-2 rounded-md hover:bg-gray-800">
                <Plus size={16} />
                추가하기
              </button>
            </Link>
          </div>
        }
      >
        <ProductListSection />
      </PageShell>
    </AppShell>
  );
};

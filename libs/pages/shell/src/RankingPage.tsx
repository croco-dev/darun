import { RankedProductSection } from "@darun/products-shell";
import { ContentArea } from "@darun/ui";
import { Layout } from "@darun/ui-layout";

export const RankingPage = () => (
  <Layout>
    <main className="mt-2 flex flex-col gap-5">
      <ContentArea>
        <RankedProductSection />
      </ContentArea>
    </main>
  </Layout>
);

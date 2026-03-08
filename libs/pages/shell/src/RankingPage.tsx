import { ContentArea } from "@darun/ui-foundation";
import { Layout } from "@darun/ui-layout";
import { RankedProductSection } from "@darun/products-shell";

export const RankingPage = () => (
  <Layout>
    <main className="mt-2 flex flex-col gap-5">
      <ContentArea>
        <RankedProductSection />
      </ContentArea>
    </main>
  </Layout>
);

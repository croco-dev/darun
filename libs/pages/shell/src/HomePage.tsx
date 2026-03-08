import { ContentArea } from "@darun/ui-foundation";
import { Layout } from "@darun/ui-layout";
import { MainHeroBanner, RecentProductSection } from "@darun/products-shell";

export const HomePage = () => (
  <Layout>
    <main className="mt-2 flex flex-col gap-5">
      <ContentArea>
        <MainHeroBanner />
        <RecentProductSection />
      </ContentArea>
    </main>
  </Layout>
);

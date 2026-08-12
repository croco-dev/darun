import { RankedProductSection } from '@darun/products-shell';
import { Layout } from '@darun/ui-layout';

export const RankingPage = () => (
  <Layout>
    <main className="flex w-full flex-col">
      <RankedProductSection />
    </main>
  </Layout>
);

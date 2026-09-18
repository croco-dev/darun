import { RankedProductSection } from '@darun/products-shell';
import { Layout } from '@darun/ui-layout';

export const RankingPage = () => (
  <Layout>
    <main className="flex min-h-[calc(100vh-4rem)] w-full flex-col bg-gradient-to-b from-surface-50/60 via-white to-white">
      <RankedProductSection />
    </main>
  </Layout>
);

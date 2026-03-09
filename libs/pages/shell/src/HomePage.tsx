import { MainHeroBanner, RecentProductSection } from '@darun/products-shell';
import { ContentArea } from '@darun/ui';
import { Layout } from '@darun/ui-layout';

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

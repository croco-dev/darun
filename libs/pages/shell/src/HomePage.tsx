import { MainHeroBanner, RecentProductSection } from '@darun/products-shell';
import { ContentArea } from '@darun/ui';
import { Layout } from '@darun/ui-layout';

export const HomePage = () => (
  <Layout>
    <main className="flex w-full flex-col">
      <ContentArea className="flex flex-col gap-8 py-6 md:gap-12 md:py-8">
        <MainHeroBanner />
        <RecentProductSection />
      </ContentArea>
    </main>
  </Layout>
);

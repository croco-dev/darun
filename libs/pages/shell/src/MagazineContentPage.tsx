import { MagazineInfoSection } from '@darun/magazines-shell';
import { ContentArea } from '@darun/ui';
import { Layout } from '@darun/ui-layout';

export const MagazineContentPage = ({ params: { slug } }: { params: { slug: string } }) => (
  <Layout>
    <div className="flex flex-col">
      <main className="flex w-full flex-col">
        <ContentArea className="py-6 md:py-8">
          <MagazineInfoSection slug={slug} />
        </ContentArea>
      </main>
    </div>
  </Layout>
);

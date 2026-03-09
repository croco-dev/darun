import { MagazineInfoSection } from '@darun/magazines-shell';
import { ContentArea } from '@darun/ui';
import { Layout } from '@darun/ui-layout';

export const MagazineContentPage = ({ params: { slug } }: { params: { slug: string } }) => (
  <Layout>
    <div className="flex flex-col">
      <main className="flex w-full flex-col">
        <ContentArea>
          <div className="flex flex-col py-3">
            <MagazineInfoSection slug={slug} />
          </div>
        </ContentArea>
      </main>
    </div>
  </Layout>
);

import { ContentArea } from '@darun/ui-foundation';
import { Layout } from '@darun/ui-layout';
import { VStack } from '@kuma-ui/core';
import { MagazineInfoSection } from '@magazines/shells';

export const MagazineContentPage = ({ params: { slug } }: { params: { slug: string } }) => (
  <Layout>
    <VStack>
      <VStack as={'main'} width={'100%'}>
        <ContentArea>
          <VStack py="12px">
            <MagazineInfoSection slug={slug} />
          </VStack>
        </ContentArea>
      </VStack>
    </VStack>
  </Layout>
);

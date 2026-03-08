import { ContentArea } from "@darun/ui-foundation";
import { Layout } from "@darun/ui-layout";
import { VStack } from "@kuma-ui/core";
import { RankedProductSection } from "@darun/products-shell";

export const RankingPage = () => (
  <Layout>
    <VStack as={"main"} mt={8} gap={20}>
      <ContentArea>
        <RankedProductSection />
      </ContentArea>
    </VStack>
  </Layout>
);

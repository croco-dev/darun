import { gql } from '@apollo/client';
import { ContentArea } from '@darun/ui-foundation';
import { Layout } from '@darun/ui-layout';
import { getClient } from '@darun/utils-apollo-client/server';
import { Link } from '@darun/utils-router';
import { Flex, VStack } from '@kuma-ui/core';
import { AlternativeProductSection, ProductSummary } from '@products/shells';
import { notFound } from 'next/navigation';
import { ProductInformationQuery } from './__generated__/ProductAlternativePage';

const productInformationQuery = gql`
  query ProductInformation($slug: String!) {
    information: productBySlug(slug: $slug) {
      id
      name
      summary
      description
      logoUrl
    }
  }
`;

export const ProductAlternativePage = async ({ params: { slug } }: { params: { slug: string } }) => {
  const {
    data: { information },
  } = await getClient().query<ProductInformationQuery>({
    query: productInformationQuery,
    variables: { slug: slug },
  });

  if (!information) {
    return notFound();
  }

  return (
    <Layout>
      <VStack>
        <VStack as={'main'} width={'100%'}>
          <VStack gap={'2px'} mb={'4px'}>
            <ContentArea>
              <Link href={`/products/${slug}`}>
                <ProductSummary name={information.name} summary={information.summary} logoUrl={information.logoUrl} />
              </Link>
            </ContentArea>
          </VStack>
          <Flex w={'100%'} h={'1px'} background={'colors.dark.100'} my={'2px'} />
          <ContentArea>
            <VStack py="12px">
              <AlternativeProductSection slug={slug} />
            </VStack>
          </ContentArea>
        </VStack>
      </VStack>
    </Layout>
  );
};

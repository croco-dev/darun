import { gql } from '@apollo/client';
import { ContentArea } from '@darun/ui-foundation';
import { Layout } from '@darun/ui-layout';
import { getClient } from '@darun/utils-apollo-client/server';
import { VStack } from '@kuma-ui/core';
import {
  ProductAlternativeSection,
  ProductDescriptionSection,
  ProductPhotoSection,
  ProductTocSection,
  ProductSummary,
  ProductSummaryLink,
  ProductDetailFeatureSection,
  ProductDetailCompanySection,
} from '@products/shells';
import { notFound } from 'next/navigation';
import { ProductPrimaryInformationQuery } from './__generated__/ProductDetailPage';

const productPrimaryInformationQuery = gql`
  query ProductPrimaryInformation($slug: String!) {
    information: productBySlug(slug: $slug) {
      id
      name
      summary
      description
      logoUrl
      screenshots {
        imageUrl
        imageAlt
      }
    }
  }
`;

export const ProductDetailPage = async ({ params: { slug } }: { params: { slug: string } }) => {
  const {
    data: { information },
  } = await getClient().query<ProductPrimaryInformationQuery>({
    query: productPrimaryInformationQuery,
    variables: { slug: slug },
  });

  if (!information) {
    return notFound();
  }

  return (
    <Layout>
      <VStack as={'main'} width={'100%'}>
        <VStack gap={'2px'} mb={'12px'}>
          <ContentArea>
            <VStack gap={'8px'}>
              <ProductSummary name={information.name} logoUrl={information.logoUrl} summary={information.summary} />
              <ProductSummaryLink slug={slug} />
            </VStack>
          </ContentArea>
        </VStack>
        <ProductTocSection />
        <ContentArea>
          <VStack id={'detail-content'}>
            <ProductDescriptionSection description={information.description || undefined} />
            <ProductPhotoSection
              screenshots={information.screenshots.map(screenshot => ({
                imageUrl: screenshot.imageUrl,
                imageAlt: screenshot.imageAlt,
              }))}
            />
            <ProductDetailFeatureSection slug={slug} />
            <ProductAlternativeSection slug={slug} />
            <ProductDetailCompanySection slug={slug} />
          </VStack>
        </ContentArea>
      </VStack>
    </Layout>
  );
};

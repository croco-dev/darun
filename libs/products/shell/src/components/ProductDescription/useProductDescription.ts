import { gql } from '@apollo/client';
import { useLocale } from 'next-intl';
import { useProductBySlugOnProductSummarySuspenseQuery } from './__generated__/useProductDescription';

gql`
  query ProductBySlugOnProductSummary($slug: String!, $locale: String!) {
    productBySlug(slug: $slug, locale: $locale) {
      id
      description
    }
  }
`;

type ProductSummaryProps = {
  slug: string;
};

export function useProductDescription({ slug }: ProductSummaryProps) {
  const locale = useLocale();
  const { data } = useProductBySlugOnProductSummarySuspenseQuery({
    variables: {
      slug,
      locale,
    },
  });

  return {
    description: data?.productBySlug?.description ?? '',
  };
}

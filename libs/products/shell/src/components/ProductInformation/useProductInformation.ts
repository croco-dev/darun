import { gql } from '@apollo/client';
import { useLocale } from 'next-intl';
import { useProductBySlugOnProductInformationSuspenseQuery } from './__generated__/useProductInformation';

gql`
  query ProductBySlugOnProductInformation($slug: String!, $locale: String!) {
    productBySlug(slug: $slug, locale: $locale) {
      id
      name
      summary
      description
      logoUrl
      tags {
        id
        name
      }
    }
  }
`;

type ProductInformationProps = { slug: string };

export function useProductInformation({ slug }: ProductInformationProps) {
  const locale = useLocale();
  const { data } = useProductBySlugOnProductInformationSuspenseQuery({
    variables: { slug, locale },
  });

  return {
    name: data?.productBySlug?.name,
    summary: data?.productBySlug?.summary,
    logoUrl: data?.productBySlug?.logoUrl,
    tags: data?.productBySlug?.tags,
  };
}

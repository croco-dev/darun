import { gql } from '@apollo/client';
import { useLocale } from 'next-intl';
import { useProductOnProductLinksSuspenseQuery } from './__generated__/useProductLinks';

gql`
  query ProductOnProductLinks($slug: String!, $locale: String!) {
    productBySlug(slug: $slug, locale: $locale) {
      id
      links {
        id
        displayLink
        link
        title
        iconUrl
      }
    }
  }
`;

type ProductLinksProps = { slug: string };

export function useProductLinks({ slug }: ProductLinksProps) {
  const locale = useLocale();
  const { data } = useProductOnProductLinksSuspenseQuery({
    variables: { slug, locale },
  });
  return { links: data?.productBySlug?.links ?? [] };
}

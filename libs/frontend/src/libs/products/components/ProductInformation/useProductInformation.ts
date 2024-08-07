import { gql } from '@apollo/client';

gql`
  query ProductBySlugOnProductInformation($slug: String!) {
    productBySlug(slug: $slug) {
      id
      name
      summary
      description
      logoUrl
    }
  }
`;

type ProductInformationProps = {
  name: string;
  summary?: string;
  logoUrl?: string;
};

export function useProductInformation(props: ProductInformationProps) {
  return { ...props };
}

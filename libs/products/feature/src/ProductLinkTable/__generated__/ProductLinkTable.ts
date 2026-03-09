import * as Types from "@darun/provider-graphql";

import { gql } from "@apollo/client";
import { EditProductLinkItemFragmentDoc } from "../../EditProductLinkItem/__generated__/EditProductLinkItem";
export type ProductLinkTableFragment = {
  __typename?: "Product";
  links: Array<{
    __typename?: "Link";
    id: string;
    isPrimary: boolean;
    title: string;
    link: string;
    displayLink: string;
    iconUrl: string;
  }>;
};

export const ProductLinkTableFragmentDoc = gql`
  fragment ProductLinkTable on Product {
    links {
      id
      isPrimary
      ...EditProductLinkItem
    }
  }
  ${EditProductLinkItemFragmentDoc}
`;

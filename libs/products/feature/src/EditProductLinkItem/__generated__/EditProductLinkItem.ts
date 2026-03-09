import * as Types from "@darun/provider-graphql";

import { gql } from "@apollo/client";
export type EditProductLinkItemFragment = {
  __typename?: "Link";
  id: string;
  title: string;
  link: string;
  displayLink: string;
  iconUrl: string;
};

export const EditProductLinkItemFragmentDoc = gql`
  fragment EditProductLinkItem on Link {
    id
    title
    link
    displayLink
    iconUrl
  }
`;

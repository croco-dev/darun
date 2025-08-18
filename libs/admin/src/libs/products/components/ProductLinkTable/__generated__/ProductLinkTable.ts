import * as Types from '@darun/provider-graphql';

import { gql } from '@apollo/client';
export type ProductLinkTableFragment = { __typename?: 'Product', links: Array<{ __typename?: 'Link', id: string, title: string, link: string, displayLink: string, iconUrl: string, isPrimary: boolean }> };

export const ProductLinkTableFragmentDoc = gql`
    fragment ProductLinkTable on Product {
  links {
    id
    title
    link
    displayLink
    iconUrl
    isPrimary
  }
}
    `;
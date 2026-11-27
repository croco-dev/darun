import { ApolloClient, ApolloLink, InMemoryCache, Observable, gql } from '@apollo/client';
import { AdminProductContentReviewDetailDocument } from '@darun/provider-graphql';
import { expect, it, vi } from 'vitest';
import { productContentReviewRefreshLink } from '../features/products/productContentReviewRefreshLink';

const edit = gql`
  mutation ReviewFixtureEdit {
    saved: updateProductFeature(id: "feature", input: { name: "changed" }) {
      __typename
    }
  }
`;
const unrelated = gql`
  mutation ReviewFixtureUnrelated {
    signImageUpload(input: { folder: "fixture", displayName: "fixture" }) {
      __typename
    }
  }
`;

it('원문 저장 성공 뒤 열린 검토의 상태를 다시 읽고 실패 또는 무관한 작업에서는 재조회하지 않는다', async () => {
  let revision = '1';
  let success = false;
  const reads = vi.fn();
  const client = new ApolloClient({
    cache: new InMemoryCache(),
    link: ApolloLink.from([
      productContentReviewRefreshLink,
      new ApolloLink(
        operation =>
          new Observable(observer => {
            if (operation.operationType === 'query') {
              reads();
              observer.next({
                data: {
                  adminProductContentReview: {
                    id: 'product',
                    revision,
                    status: revision === '1' ? 'CURRENT' : 'CHANGED',
                    due: false,
                    name: '서비스',
                    summary: '',
                    description: null,
                    features: [],
                  },
                },
              });
            } else if (operation.operationName === 'ReviewFixtureUnrelated') {
              observer.next({ data: { signImageUpload: { __typename: 'SignImageUploadPayload' } } });
            } else if (success) {
              revision = '2';
              observer.next({ data: { saved: { __typename: 'UpdateProductFeaturePayload' } } });
            } else {
              observer.next({ errors: [{ message: 'Unable to update product feature' }] });
            }
            observer.complete();
          })
      ),
    ]),
  });
  const visible = vi.fn();
  const query = client
    .watchQuery({
      query: AdminProductContentReviewDetailDocument,
      variables: { slug: 'fixture' },
      fetchPolicy: 'no-cache',
    })
    .subscribe(result => {
      if (result.data) visible(result.data.adminProductContentReview?.status);
    });
  try {
    await vi.waitFor(() => expect(visible).toHaveBeenLastCalledWith('CURRENT'));
    await expect(client.mutate({ mutation: edit })).rejects.toThrow('Unable to update product feature');
    await client.mutate({ mutation: unrelated });
    expect(reads).toHaveBeenCalledTimes(1);

    success = true;
    await client.mutate({ mutation: edit });
    await vi.waitFor(() => expect(visible).toHaveBeenLastCalledWith('CHANGED'));
    expect(reads).toHaveBeenCalledTimes(2);
  } finally {
    query.unsubscribe();
    client.stop();
  }
});

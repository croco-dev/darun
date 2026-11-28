import { gql } from '@apollo/client';
import { CombinedGraphQLErrors } from '@apollo/client/errors';
import { skipToken, useMutation, useQuery } from '@apollo/client/react';
import {
  AdminProductContentReviewDetailDocument,
  AdminProductContentReviewRecordsDocument,
  SaveAdminProductContentReviewDocument,
  type AdminProductContentReviewDetailQuery,
  type RecordAdminProductContentReviewInput,
} from '@darun/provider-graphql';
import { useEffect, useRef, useState, type FormEvent } from 'react';

gql`
  query AdminProductContentReviewDetail($slug: String!) {
    adminProductContentReview(slug: $slug) {
      id
      revision
      name
      summary
      description
      features {
        id
        name
        summary
      }
      status
      due
    }
  }
`;

gql`
  query AdminProductContentReviewRecords($productId: ID!, $before: String) {
    adminProductContentReviewHistory(productId: $productId, before: $before) {
      records {
        id
        reviewerId
        reviewedAt
        memo
        referenceUrl
        nextReviewOn
      }
      nextCursor
    }
  }
`;

gql`
  mutation SaveAdminProductContentReview($input: RecordAdminProductContentReviewInput!) {
    recordAdminProductContentReview(input: $input) {
      id
    }
  }
`;

export type Snapshot = NonNullable<AdminProductContentReviewDetailQuery['adminProductContentReview']>;
export type Draft = Pick<RecordAdminProductContentReviewInput, 'memo'> & { referenceUrl: string; nextReviewOn: string };

export function useProductContentReview({ slug }: { slug: string }) {
  const [snapshot, setSnapshot] = useState<Snapshot>();
  const [opening, setOpening] = useState(false);
  const [stale, setStale] = useState(false);
  const [notice, setNotice] = useState('');
  const [cursor, setCursor] = useState<string | null>(null);
  const request = useRef<{ payload: string; id: string } | null>(null);
  const heading = useRef<HTMLHeadingElement>(null);
  const openButton = useRef<HTMLButtonElement>(null);
  const inFlight = useRef(false);
  const wasOpen = useRef(false);

  const detail = useQuery(AdminProductContentReviewDetailDocument, {
    variables: { slug },
    fetchPolicy: 'no-cache',
  });
  const product = detail.error ? undefined : detail.data?.adminProductContentReview;
  const statusNeedsRefresh = stale && snapshot !== undefined && product?.revision === snapshot.revision;
  const history = useQuery(
    AdminProductContentReviewRecordsDocument,
    product
      ? {
          variables: { productId: product.id, before: cursor },
          fetchPolicy: 'no-cache',
        }
      : skipToken
  );
  const [save, { loading: saving }] = useMutation(SaveAdminProductContentReviewDocument);
  const reviewRevision = snapshot?.revision;

  useEffect(() => {
    if (reviewRevision !== undefined) {
      heading.current?.focus();
      wasOpen.current = true;
    } else if (wasOpen.current) {
      openButton.current?.focus();
      wasOpen.current = false;
    }
  }, [reviewRevision]);

  async function openReview() {
    setOpening(true);
    setNotice('');
    try {
      const result = await detail.refetch();
      const current = result.data?.adminProductContentReview;
      if (!current) throw new Error('Missing content review snapshot');
      setSnapshot(current);
      setStale(false);
    } catch {
      setNotice('검토할 내용을 불러오지 못했습니다. 다시 시도해 주세요.');
    } finally {
      setOpening(false);
    }
  }

  async function submit(event: FormEvent<HTMLFormElement>, draft: Draft) {
    event.preventDefault();
    if (!snapshot || stale || inFlight.current) return;
    if (!draft.memo.trim()) {
      setNotice('검토 메모를 입력해 주세요.');
      return;
    }
    inFlight.current = true;
    setNotice('');
    const input = {
      productId: snapshot.id,
      expectedRevision: snapshot.revision,
      ...draft,
    };
    const payload = JSON.stringify(input);
    if (request.current?.payload !== payload) request.current = { payload, id: crypto.randomUUID() };
    try {
      await save({
        variables: { input: { ...input, requestId: request.current.id } },
      });
    } catch (error) {
      const changed =
        CombinedGraphQLErrors.is(error) &&
        error.errors.some(item => item.extensions?.['code'] === 'PRODUCT_CONTENT_REVIEW_STALE');
      setStale(changed);
      if (changed) void detail.refetch().catch(() => {});
      setNotice(
        changed
          ? '검토 중 내용이 바뀌었습니다. 최신 내용을 다시 확인해 주세요.'
          : '검토 기록을 저장하지 못했습니다. 다시 시도해 주세요.'
      );
      return;
    } finally {
      inFlight.current = false;
    }

    setSnapshot(undefined);
    request.current = null;
    setNotice('검토 기록을 저장했습니다.');
    setCursor(null);
    const refresh = await Promise.allSettled([detail.refetch(), history.refetch({ before: null })]);
    if (refresh.some(result => result.status === 'rejected')) {
      setNotice('검토 기록을 저장했습니다. 최신 상태를 보려면 페이지를 새로고침해 주세요.');
    }
  }

  return {
    snapshot,
    opening,
    stale,
    notice,
    cursor,
    heading,
    openButton,
    product,
    statusNeedsRefresh,
    loading: detail.loading,
    error: detail.error,
    historyLoading: history.loading,
    historyError: history.error,
    records: history.data?.adminProductContentReviewHistory,
    busy: saving || opening,
    openReview,
    submit,
    setCursor,
    retryDetail: () => void detail.refetch().catch(() => {}),
    retryHistory: () => void history.refetch().catch(() => {}),
    cancel: () => {
      setSnapshot(undefined);
      setNotice('');
      request.current = null;
    },
  };
}

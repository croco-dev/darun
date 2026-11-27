'use client';

import { gql } from '@apollo/client';
import { useQuery } from '@apollo/client/react';
import { AdminProductPublishReviewDocument } from '@darun/provider-graphql';
import { Button } from '@darun/ui';
import { type ReactNode, useId, useState } from 'react';
import { usePublishProductButton } from './usePublishProductButton';

gql`
  query AdminProductPublishReview($slug: String!) {
    adminProductPublishReview(slug: $slug) {
      publishedAt
      reviewToken
      hasName
      hasSummary
      hasDescription
      hasCategory
      hasLogo
      hasScreenshot
      officialLinkStatus
      translation {
        name
        summary
        description
        observedAt
        latestJobFailed
      }
    }
  }
`;

export function PublishProductButton({ slug }: { slug: string }) {
  return <ProductPublishControl key={slug} slug={slug} />;
}

function ProductPublishControl({ slug }: { slug: string }) {
  const [open, setOpen] = useState(false);
  const reviewId = useId();
  const publish = usePublishProductButton({ slug });
  const showReview = open && !publish.isPublished;

  return (
    <>
      <Button
        type="button"
        variant="contained"
        color="secondary"
        size="sm"
        disabled={publish.isPublished || publish.loading || !publish.canReview}
        aria-expanded={showReview}
        aria-controls={showReview ? reviewId : undefined}
        onClick={() => setOpen(value => !value)}
      >
        {publish.isPublished ? '노출 중' : '발행 전 확인'}
      </Button>
      {showReview && (
        <ProductPublishReview
          id={reviewId}
          slug={slug}
          publishing={publish.loading}
          publishProduct={publish.publishProduct}
        />
      )}
    </>
  );
}

const presence = (exists: boolean) => (exists ? '입력됨' : '미입력');
const linkStatuses: Record<string, string> = {
  READY: '공식 역할과 URL 형식 확인',
  MISSING: '미입력',
  UNCLASSIFIED: '미확인 · 역할 미지정 링크 있음',
  INVALID: '확인 필요 · 공식 링크 URL 형식 오류',
};
const translationStatuses: Record<string, string> = {
  CURRENT: '최신 원문과 일치',
  STALE: '이전 원문의 번역',
  MISSING: '번역 없음',
  NOT_NEEDED: '원문 미입력',
};
const observationTime = new Intl.DateTimeFormat('ko-KR', {
  dateStyle: 'short',
  timeStyle: 'short',
  timeZone: 'Asia/Seoul',
});

function ReviewRow({ label, edit, children }: { label: string; edit: string; children: ReactNode }) {
  return (
    <div className="grid grid-cols-[minmax(5rem,1fr)_minmax(0,2fr)_auto] gap-2 py-2">
      <dt className="font-medium">{label}</dt>
      <dd>{children}</dd>
      <dd>
        <a className="underline underline-offset-2" href={`#${edit}`} aria-label={`${label} 편집 위치로 이동`}>
          이동
        </a>
      </dd>
    </div>
  );
}

function ProductPublishReview({
  id,
  slug,
  publishing,
  publishProduct,
}: {
  id: string;
  slug: string;
  publishing: boolean;
  publishProduct: ReturnType<typeof usePublishProductButton>['publishProduct'];
}) {
  const [reviewChanged, setReviewChanged] = useState(false);
  const { data, loading, error, refetch } = useQuery(AdminProductPublishReviewDocument, {
    variables: { slug },
    fetchPolicy: 'no-cache',
    errorPolicy: 'all',
    context: { queryDeduplication: false },
  });
  const review = data?.adminProductPublishReview;
  const translation = review?.translation;
  const rows = review
    ? [
        {
          label: '이름',
          status: presence(review.hasName),
          edit: 'product-edit-basic',
        },
        {
          label: '요약',
          status: presence(review.hasSummary),
          edit: 'product-edit-basic',
        },
        {
          label: '본문',
          status: presence(review.hasDescription),
          edit: 'product-edit-description',
        },
        {
          label: '카테고리',
          status: presence(review.hasCategory),
          edit: 'product-edit-category',
        },
        {
          label: '공식 링크',
          status: linkStatuses[review.officialLinkStatus] ?? '확인 실패',
          edit: 'product-edit-links',
        },
        {
          label: '로고',
          status: presence(review.hasLogo),
          edit: 'product-edit-basic',
        },
        {
          label: '스크린샷',
          status: presence(review.hasScreenshot),
          edit: 'product-edit-screenshots',
        },
      ]
    : [];

  async function refresh() {
    const result = await refetch().catch(() => undefined);
    if (result?.data?.adminProductPublishReview) setReviewChanged(false);
  }

  async function publish() {
    if (!review || reviewChanged || loading || publishing || review.publishedAt) return;
    if ((await publishProduct(review.reviewToken)) === 'review-changed') setReviewChanged(true);
  }

  return (
    <section
      id={id}
      aria-labelledby={`${id}-heading`}
      className="basis-full min-w-0 rounded-lg border border-dark-200 bg-white p-4"
    >
      <h2 id={`${id}-heading`} className="text-sm font-semibold">
        발행 준비 상태
      </h2>
      <p className="mt-1 text-sm text-dark-600">저장된 항목을 확인합니다. 선택 항목은 비워 둔 채 발행할 수 있습니다.</p>
      {loading && (
        <p role="status" className="mt-3 text-sm">
          준비 상태 확인 중…
        </p>
      )}
      {!loading && !review && (
        <p role="alert" className="mt-3 text-sm">
          {error ? '준비 상태를 불러오지 못했습니다.' : '서비스 정보를 찾지 못했습니다.'}
        </p>
      )}
      {!loading && review && (
        <>
          <dl className="my-3 divide-y divide-dark-200 text-sm">
            {rows.map(({ label, status, edit }) => (
              <ReviewRow key={label} label={label} edit={edit}>
                {status}
              </ReviewRow>
            ))}
            <ReviewRow label="영어 번역" edit="product-edit-translation">
              {translation ? (
                <>
                  <ul>
                    <li>이름 · {translationStatuses[translation.name] ?? '확인 실패'}</li>
                    <li>요약 · {translationStatuses[translation.summary] ?? '확인 실패'}</li>
                    <li>본문 · {translationStatuses[translation.description] ?? '확인 실패'}</li>
                  </ul>
                  {translation.latestJobFailed && <p>최근 영어 번역 작업 실패</p>}
                  <p className="mt-1 text-xs text-dark-600">
                    {observationTime.format(new Date(translation.observedAt))} 기준
                  </p>
                </>
              ) : (
                '확인 실패'
              )}
            </ReviewRow>
          </dl>
          {review.publishedAt && (
            <p role="status" className="mb-3 text-sm">
              이미 발행된 서비스입니다.
            </p>
          )}
        </>
      )}
      {reviewChanged && (
        <p role="alert" className="mb-3 text-sm">
          검토 이후 서비스 정보가 바뀌었습니다. 다시 확인해 주세요.
        </p>
      )}
      <div className="mt-3 flex flex-wrap gap-2">
        <Button type="button" size="sm" variant="base" disabled={loading || publishing} onClick={() => void refresh()}>
          다시 확인
        </Button>
        <Button
          type="button"
          size="sm"
          variant="contained"
          color="secondary"
          disabled={!review || Boolean(review.publishedAt) || reviewChanged || loading || publishing}
          onClick={() => void publish()}
        >
          {publishing ? '발행 중…' : '서비스 발행'}
        </Button>
      </div>
    </section>
  );
}

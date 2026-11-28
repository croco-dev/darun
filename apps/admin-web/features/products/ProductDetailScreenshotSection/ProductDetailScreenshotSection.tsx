'use client';

import { gql } from '@apollo/client';
import { CombinedGraphQLErrors } from '@apollo/client/errors';
import { useMutation, useQuery } from '@apollo/client/react';
import { VISUAL_UI_ELEMENTS, VISUAL_UI_ELEMENTS_MAX_COUNT } from '@darun/products-domain/visual-ui-elements';
import { queueProductScreenshotRefresh } from '@darun/products-feature';
import {
  GetProductScreenshotsOnDetailSectionDocument,
  DeleteProductScreenshotOnDetailSectionDocument,
  UpdateProductScreenshotOnDetailSectionDocument,
  ReorderProductScreenshotsOnDetailSectionDocument,
  type VisualPlatform,
  type VisualScreenType,
  type VisualUiElement,
} from '@darun/provider-graphql';
import { ArrowDown, ArrowUp, Button, ImageOff, Loader2, Pencil, Plus, Trash2 } from '@darun/ui';
import {
  AdminEmptyState,
  AdminErrorState,
  AdminLoadingState,
  AdminPanel,
  AdminSectionBody,
  AdminSectionHeader,
  AdminSelect,
} from '@darun/ui-admin';
import { Link } from '@darun/utils-router';
import { notifications } from '@mantine/notifications';
import { useId, useLayoutEffect, useRef, useState } from 'react';

gql`
  query GetProductScreenshotsOnDetailSection($slug: String!) {
    tempProductBySlug(slug: $slug) {
      id
      coverScreenshot {
        id
      }
      screenshots {
        id
        imageUrl
        imageAlt
        title
        platform
        screenType
        uiElements
      }
    }
  }

  mutation ReorderProductScreenshotsOnDetailSection($productId: ID!, $orderedIds: [ID!]!, $expectedOrderIds: [ID!]!) {
    reorderProductScreenshots(productId: $productId, orderedIds: $orderedIds, expectedOrderIds: $expectedOrderIds)
  }

  mutation DeleteProductScreenshotOnDetailSection($id: String!) {
    deleteProductScreenshot(id: $id) {
      success
    }
  }

  mutation UpdateProductScreenshotOnDetailSection(
    $id: ID!
    $imageAlt: String!
    $title: String
    $platform: VisualPlatform
    $screenType: VisualScreenType
    $uiElements: [VisualUiElement!]
  ) {
    updateProductScreenshot(
      input: {
        id: $id
        imageAlt: $imageAlt
        title: $title
        platform: $platform
        screenType: $screenType
        uiElements: $uiElements
      }
    ) {
      screenshot {
        id
        imageUrl
        imageAlt
        title
        platform
        screenType
      }
    }
  }
`;

type ProductDetailScreenshotSectionProps = {
  slug: string;
};

type ScreenshotCardFields = {
  id: string;
  imageUrl: string;
  imageAlt: string;
  title: string | null;
  platform: VisualPlatform | null;
  screenType: VisualScreenType | null;
  uiElements: VisualUiElement[];
};

type ScreenshotMetadataDraft = {
  imageAlt: string;
  title: string;
  platform: VisualPlatform | '';
  screenType: VisualScreenType | '';
};

type ScreenshotOrderDraft = {
  slug: string;
  productId: string;
  savedCoverId: string | undefined;
  expectedOrderIds: string[];
  rows: ScreenshotCardFields[];
};

const orderControlClass =
  'inline-flex min-h-8 items-center justify-center gap-1 rounded px-2 text-dark-700 hover:bg-surface-200 aria-disabled:opacity-40 focus-visible:outline-offset-2';

const PLATFORM_SELECT_OPTIONS: Array<{
  value: VisualPlatform | '';
  label: string;
}> = [
  { value: '', label: '미분류' },
  { value: 'WEB', label: '웹' },
  { value: 'IOS', label: 'iOS' },
  { value: 'ANDROID', label: 'Android' },
];

const SCREEN_TYPE_SELECT_OPTIONS: Array<{
  value: VisualScreenType | '';
  label: string;
}> = [
  { value: '', label: '미분류' },
  { value: 'HOME', label: '홈' },
  { value: 'ONBOARDING', label: '온보딩' },
  { value: 'SIGN_UP', label: '회원가입' },
  { value: 'SIGN_IN', label: '로그인' },
  { value: 'SEARCH', label: '검색' },
  { value: 'LIST', label: '목록' },
  { value: 'DETAIL', label: '상세' },
  { value: 'CHECKOUT', label: '결제' },
  { value: 'SETTINGS', label: '설정' },
  { value: 'OTHER', label: '기타' },
];

const UI_ELEMENT_LABELS: Record<VisualUiElement, string> = {
  AVATAR: '아바타',
  BADGE: '배지',
  BOTTOM_SHEET: '바텀시트',
  BUTTON: '버튼',
  CALENDAR: '달력',
  CARD: '카드',
  CAROUSEL: '캐러셀',
  DROPDOWN: '드롭다운',
  INPUT: '입력',
  LIST: '리스트',
  MAP: '지도',
  MODAL: '모달',
  NAVIGATION_BAR: '내비게이션 바',
  PAGINATION: '페이지네이션',
  PROGRESS: '프로그레스',
  SEARCH_BAR: '검색 바',
  STEPPER: '스테퍼',
  TAB_BAR: '탭 바',
  TABLE: '테이블',
  TOGGLE: '토글',
};

function selectOptionValue<T extends string>(options: Array<{ value: T; label: string }>, raw: string): T {
  return options.find(option => option.value === raw)?.value ?? options[0].value;
}

function ScreenshotImage({ src, alt }: { src: string; alt: string }) {
  const [hasError, setHasError] = useState(false);
  const [prevSrc, setPrevSrc] = useState(src);

  if (src !== prevSrc) {
    setPrevSrc(src);
    setHasError(false);
  }

  if (hasError) {
    return (
      <div className="flex h-full w-full flex-col items-center justify-center gap-1 bg-surface-200 text-dark-400 p-2 text-center">
        <ImageOff size={24} className="shrink-0" aria-hidden="true" />
        <span className="text-2xs text-dark-500">이미지를 불러올 수 없음</span>
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={alt}
      onError={() => setHasError(true)}
      className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.02]"
      loading="lazy"
    />
  );
}

function ScreenshotMetadataEditor({
  screenshot,
  refreshScreenshots,
  onClose,
}: {
  screenshot: ScreenshotCardFields;
  refreshScreenshots: () => Promise<unknown>;
  onClose: () => void;
}) {
  const [draft, setDraft] = useState<ScreenshotMetadataDraft>({
    imageAlt: screenshot.imageAlt,
    title: screenshot.title ?? '',
    platform: screenshot.platform ?? '',
    screenType: screenshot.screenType ?? '',
  });
  const [isSaving, setIsSaving] = useState(false);
  const [editedUiElements, setEditedUiElements] = useState<VisualUiElement[]>();
  const uiElements = editedUiElements ?? screenshot.uiElements;
  const uiElementCountId = useId();

  const [updateScreenshot] = useMutation(UpdateProductScreenshotOnDetailSectionDocument, {
    onError: error => {
      notifications.show({
        title: '저장 실패',
        message: error.message,
        color: 'red',
      });
    },
  });

  const trimmedAlt = draft.imageAlt.trim();
  const trimmedTitle = draft.title.trim();
  const isSubmitDisabled = isSaving || trimmedAlt.length === 0 || trimmedAlt.length > 100 || trimmedTitle.length > 100;

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (isSubmitDisabled) {
      return;
    }
    setIsSaving(true);
    try {
      const result = await updateScreenshot({
        variables: {
          id: screenshot.id,
          imageAlt: trimmedAlt,
          title: trimmedTitle.length > 0 ? trimmedTitle : null,
          platform: draft.platform || null,
          screenType: draft.screenType || null,
          ...(editedUiElements !== undefined ? { uiElements: editedUiElements } : {}),
        },
      });
      if (result.data?.updateProductScreenshot?.screenshot) {
        await refreshScreenshots();
        notifications.show({ message: '메타데이터가 저장되었습니다.', color: 'teal' });
        onClose();
      }
    } catch {
      // Handled by onError; draft stays in local state so input is preserved.
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="mt-2 flex flex-col gap-2 px-1 pb-1">
      <label className="flex flex-col gap-1 text-2xs font-semibold text-dark-600">
        이미지 alt
        <input
          value={draft.imageAlt}
          onChange={event => {
            const value = event.currentTarget.value;
            setDraft(previous => ({
              ...previous,
              imageAlt: value,
            }));
          }}
          disabled={isSaving}
          maxLength={100}
          className="h-9 rounded-lg border border-dark-200 bg-white px-2.5 text-xs font-normal text-dark-900 focus:outline-none focus:ring-2 focus:ring-dark-900/60"
        />
      </label>
      <label className="flex flex-col gap-1 text-2xs font-semibold text-dark-600">
        제목
        <input
          value={draft.title}
          onChange={event => {
            const value = event.currentTarget.value;
            setDraft(previous => ({
              ...previous,
              title: value,
            }));
          }}
          disabled={isSaving}
          maxLength={100}
          placeholder="ex) 회원가입 화면"
          className="h-9 rounded-lg border border-dark-200 bg-white px-2.5 text-xs font-normal text-dark-900 focus:outline-none focus:ring-2 focus:ring-dark-900/60"
        />
      </label>
      <label className="flex flex-col gap-1 text-2xs font-semibold text-dark-600">
        플랫폼
        <AdminSelect
          value={draft.platform}
          onChange={event => {
            const value = event.currentTarget.value;
            setDraft(previous => ({
              ...previous,
              platform: selectOptionValue(PLATFORM_SELECT_OPTIONS, value),
            }));
          }}
          disabled={isSaving}
        >
          {PLATFORM_SELECT_OPTIONS.map(option => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </AdminSelect>
      </label>
      <label className="flex flex-col gap-1 text-2xs font-semibold text-dark-600">
        화면 유형
        <AdminSelect
          value={draft.screenType}
          onChange={event => {
            const value = event.currentTarget.value;
            setDraft(previous => ({
              ...previous,
              screenType: selectOptionValue(SCREEN_TYPE_SELECT_OPTIONS, value),
            }));
          }}
          disabled={isSaving}
        >
          {SCREEN_TYPE_SELECT_OPTIONS.map(option => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </AdminSelect>
      </label>
      <fieldset disabled={isSaving} aria-describedby={uiElementCountId} className="@container min-w-0">
        <legend className="text-2xs font-semibold text-dark-600">UI 요소</legend>
        <div className="flex flex-wrap items-center justify-between gap-x-2">
          <output id={uiElementCountId} className="block text-2xs text-dark-600">
            {uiElements.length}개 선택 · 최대 {VISUAL_UI_ELEMENTS_MAX_COUNT}개
          </output>
          <button
            type="button"
            onClick={() => setEditedUiElements([])}
            disabled={uiElements.length === 0}
            className="min-h-8 max-w-full rounded px-1 text-2xs font-medium text-dark-700 underline [overflow-wrap:anywhere] disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-dark-900/60"
          >
            전체 해제
          </button>
        </div>
        <div className="grid grid-cols-1 gap-x-2 @min-[14rem]:grid-cols-2">
          {VISUAL_UI_ELEMENTS.map(value => {
            const checked = uiElements.includes(value);
            return (
              <label
                key={value}
                className="flex min-h-8 items-center gap-1.5 text-2xs text-dark-700 has-disabled:opacity-50"
              >
                <input
                  type="checkbox"
                  value={value}
                  checked={checked}
                  disabled={!checked && uiElements.length >= VISUAL_UI_ELEMENTS_MAX_COUNT}
                  onChange={event => {
                    const selected = event.currentTarget.checked;
                    setEditedUiElements(previous => {
                      const current = previous ?? screenshot.uiElements;
                      if (!selected) return current.filter(element => element !== value);
                      return current.length < VISUAL_UI_ELEMENTS_MAX_COUNT ? [...current, value] : previous;
                    });
                  }}
                  className="shrink-0 accent-dark-900 focus-visible:outline-offset-2"
                />
                <span className="min-w-0 [overflow-wrap:anywhere]">{UI_ELEMENT_LABELS[value]}</span>
              </label>
            );
          })}
        </div>
      </fieldset>
      <div className="flex items-center gap-2">
        <Button
          type="submit"
          size="sm"
          variant="contained"
          color="primary"
          disabled={isSubmitDisabled}
          className="active:scale-[0.98] motion-reduce:transform-none"
        >
          {isSaving ? '저장 중...' : '저장'}
        </Button>
        <Button
          type="button"
          size="sm"
          variant="text"
          color="primary"
          onClick={onClose}
          disabled={isSaving}
          className="active:scale-[0.98] motion-reduce:transform-none"
        >
          취소
        </Button>
      </div>
    </form>
  );
}

export const ProductDetailScreenshotSection = ({ slug }: ProductDetailScreenshotSectionProps) => {
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [orderDraft, setOrderDraft] = useState<ScreenshotOrderDraft | null>(null);
  const [orderFailure, setOrderFailure] = useState<{ draft: ScreenshotOrderDraft; conflict: boolean } | null>(null);
  const [savingOrder, setSavingOrder] = useState(false);
  const moveFocus = useRef<HTMLButtonElement | null>(null);

  const { client, data, loading, error, observable } = useQuery(GetProductScreenshotsOnDetailSectionDocument, {
    variables: { slug },
  });
  const [reorderScreenshots] = useMutation(ReorderProductScreenshotsOnDetailSectionDocument);

  useLayoutEffect(() => {
    moveFocus.current?.focus();
    moveFocus.current = null;
  }, [orderDraft]);

  const refreshScreenshots = (afterSave = false, savedProductId?: string) =>
    queueProductScreenshotRefresh(
      client,
      slug,
      async () => {
        if (observable.variables.slug === slug) {
          const request = observable.refetch();
          await (afterSave ? request.retain() : request);
        } else if (afterSave) {
          // A committed edit refreshes its own product after the mounted list switches products.
          await client.query({
            query: GetProductScreenshotsOnDetailSectionDocument,
            variables: { slug },
            fetchPolicy: 'network-only',
          });
        } else {
          return false;
        }
        return true;
      },
      savedProductId
    ).catch(() => false);
  const [deleteScreenshot] = useMutation(DeleteProductScreenshotOnDetailSectionDocument, {
    onError: err => {
      notifications.show({
        title: '삭제 실패',
        message: err.message,
        color: 'red',
      });
    },
    onCompleted: () => {
      notifications.show({
        message: '스크린샷이 삭제되었습니다.',
        color: 'teal',
      });
      void refreshScreenshots();
    },
  });

  const handleDelete = async (id: string) => {
    if (deletingId !== null) {
      return;
    }
    if (!window.confirm('이 스크린샷을 삭제하시겠습니까?')) {
      return;
    }

    setDeletingId(id);
    try {
      const result = await deleteScreenshot({ variables: { id } });
      if (result.data?.deleteProductScreenshot?.success) {
        setEditingId(current => (current === id ? null : current));
      }
    } catch {
      // Handled by onError
    } finally {
      setDeletingId(null);
    }
  };

  const screenshots: ScreenshotCardFields[] = (data?.tempProductBySlug?.screenshots ?? []).flatMap(screenshot =>
    screenshot
      ? [
          {
            id: screenshot.id ?? '',
            imageUrl: screenshot.imageUrl ?? '',
            imageAlt: screenshot.imageAlt ?? '',
            title: screenshot.title ?? null,
            platform: screenshot.platform ?? null,
            screenType: screenshot.screenType ?? null,
            uiElements: screenshot.uiElements,
          },
        ]
      : []
  );
  const product = data?.tempProductBySlug;
  const draft = orderDraft?.slug === slug && (!product || orderDraft.productId === product.id) ? orderDraft : null;
  const failure = orderFailure && orderFailure.draft === draft ? orderFailure : null;
  const savedCoverId = product?.coverScreenshot?.id;
  const orderChanged =
    draft !== null &&
    (draft.rows[0]?.id !== draft.savedCoverId ||
      draft.rows.some(({ id }, index) => id !== draft.expectedOrderIds[index]));
  const orderConflict = Boolean(
    draft &&
    (failure?.conflict ||
      (data &&
        !error &&
        (!product ||
          screenshots.length !== draft.expectedOrderIds.length ||
          screenshots.some(({ id }, index) => id !== draft.expectedOrderIds[index]))))
  );
  const currentRows = new Map(screenshots.map(screenshot => [screenshot.id, screenshot]));
  const displayedScreenshots = draft?.rows.map(row => currentRows.get(row.id) ?? row) ?? screenshots;
  const coverId = orderChanged ? draft.rows[0]?.id : savedCoverId;
  const orderControlsDisabled = savingOrder || loading || Boolean(error) || deletingId !== null || orderConflict;

  const moveScreenshot = (from: number, to: number, button: HTMLButtonElement) => {
    if (!product?.id || orderControlsDisabled || to < 0 || to >= displayedScreenshots.length) return;
    if (from === to && displayedScreenshots[to].id === coverId) return;
    if (document.activeElement === button) moveFocus.current = button;
    const rows = [...displayedScreenshots];
    const [moved] = rows.splice(from, 1);
    rows.splice(to, 0, moved);
    setOrderDraft({
      slug,
      productId: product.id,
      savedCoverId: draft?.savedCoverId ?? savedCoverId,
      expectedOrderIds: draft?.expectedOrderIds ?? screenshots.map(({ id }) => id),
      rows,
    });
  };

  const saveOrder = async () => {
    if (!draft || !orderChanged || orderControlsDisabled) return;
    setSavingOrder(true);
    setOrderFailure(null);
    try {
      const result = await reorderScreenshots({
        variables: {
          productId: draft.productId,
          orderedIds: draft.rows.map(({ id }) => id),
          expectedOrderIds: draft.expectedOrderIds,
        },
      });
      if (!result.data?.reorderProductScreenshots) throw new Error('Missing screenshot order confirmation');
      await refreshScreenshots(true, draft.productId);
      setOrderDraft(current => (current === draft ? null : current));
      notifications.show({ message: '스크린샷 순서를 저장했습니다.', color: 'teal' });
    } catch (error) {
      setOrderFailure({
        draft,
        conflict:
          CombinedGraphQLErrors.is(error) &&
          error.errors.some(({ extensions }) => extensions?.code === 'product-screenshot/order-changed'),
      });
    } finally {
      setSavingOrder(false);
    }
  };

  const loadLatestOrder = async () => {
    if (loading || savingOrder || !draft) return;
    if (await refreshScreenshots()) {
      setOrderDraft(current => (current === draft ? null : current));
    }
  };

  return (
    <AdminPanel>
      <AdminSectionHeader
        title="스크린샷 관리"
        rightSide={
          <Button
            as={Link}
            href={`/products/${encodeURIComponent(slug)}/screenshots/new`}
            variant="contained"
            color="primary"
            size="sm"
            className="flex items-center gap-1.5 active:scale-[0.98] motion-reduce:transform-none"
          >
            <Plus size={16} className="shrink-0" aria-hidden="true" />
            <span className="whitespace-nowrap">스크린샷 추가</span>
          </Button>
        }
      />
      <AdminSectionBody>
        {draft && (
          <div className="mb-4 flex flex-wrap items-center gap-2">
            {orderConflict && !savingOrder && (
              <p role="alert" className="w-full text-sm text-cherry-700">
                다른 작업으로 스크린샷 목록이나 순서가 바뀌었습니다. 최신 목록을 불러온 뒤 다시 정렬해 주세요.
              </p>
            )}
            {failure && !orderConflict && (
              <p role="alert" className="w-full text-sm text-cherry-700">
                순서를 저장하지 못했습니다. 변경한 순서를 유지했습니다.
              </p>
            )}
            {orderConflict && !savingOrder ? (
              <Button size="sm" type="button" onClick={() => void loadLatestOrder()} disabled={loading || savingOrder}>
                최신 목록으로 다시 시작
              </Button>
            ) : (
              <Button
                size="sm"
                type="button"
                onClick={() => void saveOrder()}
                disabled={!orderChanged || orderControlsDisabled}
              >
                {savingOrder ? '순서 저장 중…' : '순서 저장'}
              </Button>
            )}
            <Button size="sm" type="button" variant="text" onClick={() => setOrderDraft(null)} disabled={savingOrder}>
              순서 변경 취소
            </Button>
            <span role="status" className="text-xs text-dark-600">
              {orderChanged && !orderConflict ? '저장하지 않은 순서 변경이 있습니다.' : ''}
            </span>
          </div>
        )}
        {loading && data && (
          <p role="status" className="mb-4 text-xs text-dark-500">
            스크린샷을 새로 불러오는 중입니다.
          </p>
        )}
        {error && (
          <AdminErrorState
            error={error}
            action={
              <Button
                type="button"
                onClick={() => void refreshScreenshots()}
                variant="contained"
                color="primary"
                className="active:scale-[0.98] motion-reduce:transform-none"
              >
                다시 시도
              </Button>
            }
          />
        )}
        {loading && !data ? (
          <AdminLoadingState />
        ) : (!data || (error && screenshots.length === 0)) && !draft ? null : displayedScreenshots.length === 0 ? (
          <AdminEmptyState
            title="등록된 스크린샷이 없습니다."
            description="서비스의 주요 기능 및 화면을 보여주는 스크린샷을 등록해 보세요."
            action={
              <Button
                as={Link}
                href={`/products/${encodeURIComponent(slug)}/screenshots/new`}
                variant="contained"
                color="primary"
                size="sm"
                className="flex items-center gap-1.5 active:scale-[0.98] motion-reduce:transform-none"
              >
                <Plus size={16} className="shrink-0" aria-hidden="true" />
                <span className="whitespace-nowrap">스크린샷 추가</span>
              </Button>
            }
          />
        ) : (
          <ol className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3" aria-label="스크린샷 순서">
            {displayedScreenshots.map((screenshot, index) => (
              <li
                key={screenshot.id}
                className="group relative flex flex-col overflow-hidden rounded-lg border border-dark-200 bg-surface-100/30 p-2 transition hover:border-dark-300 hover:shadow-card"
              >
                <a
                  href={screenshot.imageUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="aspect-video w-full overflow-hidden rounded-md bg-dark-100 block cursor-zoom-in group/img relative"
                  title="원본 이미지 보기 (새 창)"
                >
                  <ScreenshotImage src={screenshot.imageUrl} alt={screenshot.imageAlt || '서비스 스크린샷'} />
                </a>
                <div className="mt-2.5 flex items-center justify-between gap-2 px-1">
                  <span className="truncate text-xs font-medium text-dark-700" title={screenshot.imageAlt}>
                    {screenshot.imageAlt || '(대체 텍스트 없음)'}
                  </span>
                  <span className="flex shrink-0 items-center gap-1">
                    <button
                      type="button"
                      onClick={() => setEditingId(current => (current === screenshot.id ? null : screenshot.id))}
                      disabled={deletingId !== null || !currentRows.has(screenshot.id)}
                      className="inline-flex min-h-[32px] min-w-[32px] items-center justify-center rounded p-1 text-dark-400 transition hover:bg-surface-100 hover:text-dark-900 active:scale-95 disabled:opacity-50 motion-reduce:transform-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-dark-900/60"
                      title={editingId === screenshot.id ? '메타데이터 편집 닫기' : '메타데이터 수정'}
                      aria-label={editingId === screenshot.id ? '메타데이터 편집 닫기' : '메타데이터 수정'}
                      aria-expanded={editingId === screenshot.id}
                    >
                      <Pencil size={16} className="shrink-0" aria-hidden="true" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(screenshot.id)}
                      disabled={deletingId !== null || !currentRows.has(screenshot.id)}
                      className="inline-flex min-h-[32px] min-w-[32px] items-center justify-center rounded p-1 text-dark-400 transition hover:bg-cherry-50 hover:text-cherry-600 active:scale-95 disabled:opacity-50 motion-reduce:transform-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cherry-600/60"
                      title={deletingId === screenshot.id ? '삭제 중...' : '스크린샷 삭제'}
                      aria-label={deletingId === screenshot.id ? '삭제 중' : '스크린샷 삭제'}
                    >
                      {deletingId === screenshot.id ? (
                        <Loader2 size={16} className="animate-spin text-cherry-600 motion-reduce:animate-none" />
                      ) : (
                        <Trash2 size={16} className="shrink-0" aria-hidden="true" />
                      )}
                    </button>
                  </span>
                </div>
                <p className="px-1 text-2xs text-dark-600 [overflow-wrap:anywhere]">
                  {screenshot.uiElements.length
                    ? screenshot.uiElements.map(value => UI_ELEMENT_LABELS[value]).join(', ')
                    : 'UI 요소 미분류'}
                </p>
                {coverId === screenshot.id && (
                  <p className="px-1 text-xs font-medium text-dark-800">
                    {orderChanged ? '대표 화면 예정' : '대표 화면'}
                  </p>
                )}
                {displayedScreenshots.length > 1 && (
                  <div
                    role="group"
                    aria-label={`${index + 1}번 스크린샷 순서 조정`}
                    className="mt-1 flex flex-wrap items-center gap-1 text-xs"
                  >
                    <button
                      type="button"
                      className={orderControlClass}
                      aria-label="위로 이동"
                      aria-disabled={orderControlsDisabled || index === 0}
                      onClick={event => moveScreenshot(index, index - 1, event.currentTarget)}
                    >
                      <ArrowUp size={14} aria-hidden="true" />
                    </button>
                    <button
                      type="button"
                      className={orderControlClass}
                      aria-label="아래로 이동"
                      aria-disabled={orderControlsDisabled || index === displayedScreenshots.length - 1}
                      onClick={event => moveScreenshot(index, index + 1, event.currentTarget)}
                    >
                      <ArrowDown size={14} aria-hidden="true" />
                    </button>
                    <button
                      type="button"
                      className={orderControlClass}
                      aria-disabled={orderControlsDisabled || (index === 0 && coverId === screenshot.id)}
                      onClick={event => moveScreenshot(index, 0, event.currentTarget)}
                    >
                      첫 화면으로
                    </button>
                  </div>
                )}
                {editingId === screenshot.id && currentRows.has(screenshot.id) && (
                  <ScreenshotMetadataEditor
                    screenshot={screenshot}
                    refreshScreenshots={() => refreshScreenshots(true)}
                    onClose={() => setEditingId(current => (current === screenshot.id ? null : current))}
                  />
                )}
              </li>
            ))}
          </ol>
        )}
      </AdminSectionBody>
    </AdminPanel>
  );
};

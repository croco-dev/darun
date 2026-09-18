'use client';

import { gql } from '@apollo/client';
import { useMutation, useQuery } from '@apollo/client/react';
import {
  GetProductScreenshotsOnDetailSectionDocument,
  DeleteProductScreenshotOnDetailSectionDocument,
  UpdateProductScreenshotOnDetailSectionDocument,
  type VisualPlatform,
  type VisualScreenType,
} from '@darun/provider-graphql';
import { Button } from '@darun/ui';
import {
  AdminEmptyState,
  AdminErrorState,
  AdminLoadingState,
  AdminPanel,
  AdminSectionBody,
  AdminSectionHeader,
} from '@darun/ui-admin';
import { Link } from '@darun/utils-router';
import { notifications } from '@mantine/notifications';
import { ImageOff, Loader2, Pencil, Plus, Trash2 } from 'lucide-react';
import { useState } from 'react';

// eslint-disable-next-line @typescript-eslint/no-unused-expressions
gql`
  query GetProductScreenshotsOnDetailSection($slug: String!) {
    tempProductBySlug(slug: $slug) {
      id
      screenshots {
        id
        imageUrl
        imageAlt
        title
        platform
        screenType
      }
    }
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
  ) {
    updateProductScreenshot(
      input: { id: $id, imageAlt: $imageAlt, title: $title, platform: $platform, screenType: $screenType }
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
};

type ScreenshotMetadataDraft = {
  imageAlt: string;
  title: string;
  platform: VisualPlatform | '';
  screenType: VisualScreenType | '';
};

const PLATFORM_SELECT_OPTIONS: Array<{ value: VisualPlatform | ''; label: string }> = [
  { value: '', label: '미분류' },
  { value: 'WEB', label: '웹' },
  { value: 'IOS', label: 'iOS' },
  { value: 'ANDROID', label: 'Android' },
];

const SCREEN_TYPE_SELECT_OPTIONS: Array<{ value: VisualScreenType | ''; label: string }> = [
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
        <ImageOff size={24} />
        <span className="text-[11px] text-dark-500">이미지를 불러올 수 없음</span>
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
  slug,
  onClose,
}: {
  screenshot: ScreenshotCardFields;
  slug: string;
  onClose: () => void;
}) {
  const [draft, setDraft] = useState<ScreenshotMetadataDraft>({
    imageAlt: screenshot.imageAlt,
    title: screenshot.title ?? '',
    platform: screenshot.platform ?? '',
    screenType: screenshot.screenType ?? '',
  });
  const [isSaving, setIsSaving] = useState(false);

  const [updateScreenshot] = useMutation(UpdateProductScreenshotOnDetailSectionDocument, {
    refetchQueries: [{ query: GetProductScreenshotsOnDetailSectionDocument, variables: { slug } }],
    awaitRefetchQueries: true,
    onCompleted: () => {
      notifications.show({ message: '메타데이터가 저장되었습니다.', color: 'teal' });
      onClose();
    },
    onError: error => {
      notifications.show({ title: '저장 실패', message: error.message, color: 'red' });
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
      await updateScreenshot({
        variables: {
          id: screenshot.id,
          imageAlt: trimmedAlt,
          title: trimmedTitle.length > 0 ? trimmedTitle : null,
          platform: draft.platform || null,
          screenType: draft.screenType || null,
        },
      });
    } catch {
      // Handled by onError; draft stays in local state so input is preserved.
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="mt-2 flex flex-col gap-2 px-1 pb-1">
      <label className="flex flex-col gap-1 text-[11px] font-semibold text-dark-600">
        이미지 alt
        <input
          value={draft.imageAlt}
          onChange={event => setDraft(previous => ({ ...previous, imageAlt: event.currentTarget.value }))}
          disabled={isSaving}
          maxLength={100}
          className="h-9 rounded-lg border border-dark-200 bg-white px-2.5 text-xs font-normal text-dark-900 focus:outline-none focus:ring-2 focus:ring-dark-900/60"
        />
      </label>
      <label className="flex flex-col gap-1 text-[11px] font-semibold text-dark-600">
        제목
        <input
          value={draft.title}
          onChange={event => setDraft(previous => ({ ...previous, title: event.currentTarget.value }))}
          disabled={isSaving}
          maxLength={100}
          placeholder="ex) 회원가입 화면"
          className="h-9 rounded-lg border border-dark-200 bg-white px-2.5 text-xs font-normal text-dark-900 focus:outline-none focus:ring-2 focus:ring-dark-900/60"
        />
      </label>
      <label className="flex flex-col gap-1 text-[11px] font-semibold text-dark-600">
        플랫폼
        <select
          value={draft.platform}
          onChange={event =>
            setDraft(previous => ({
              ...previous,
              platform: selectOptionValue(PLATFORM_SELECT_OPTIONS, event.currentTarget.value),
            }))
          }
          disabled={isSaving}
          className="h-9 rounded-lg border border-dark-200 bg-white px-2 text-xs font-normal text-dark-900 focus:outline-none focus:ring-2 focus:ring-dark-900/60"
        >
          {PLATFORM_SELECT_OPTIONS.map(option => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </label>
      <label className="flex flex-col gap-1 text-[11px] font-semibold text-dark-600">
        화면 유형
        <select
          value={draft.screenType}
          onChange={event =>
            setDraft(previous => ({
              ...previous,
              screenType: selectOptionValue(SCREEN_TYPE_SELECT_OPTIONS, event.currentTarget.value),
            }))
          }
          disabled={isSaving}
          className="h-9 rounded-lg border border-dark-200 bg-white px-2 text-xs font-normal text-dark-900 focus:outline-none focus:ring-2 focus:ring-dark-900/60"
        >
          {SCREEN_TYPE_SELECT_OPTIONS.map(option => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </label>
      <div className="flex items-center gap-2">
        <Button type="submit" size="sm" variant="contained" color="primary" disabled={isSubmitDisabled}>
          {isSaving ? '저장 중...' : '저장'}
        </Button>
        <Button type="button" size="sm" variant="text" color="primary" onClick={onClose} disabled={isSaving}>
          취소
        </Button>
      </div>
    </form>
  );
}

export const ProductDetailScreenshotSection = ({ slug }: ProductDetailScreenshotSectionProps) => {
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);

  const { data, loading, error, refetch } = useQuery(GetProductScreenshotsOnDetailSectionDocument, {
    variables: { slug },
  });

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
      refetch();
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
      await deleteScreenshot({ variables: { id } });
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
          },
        ]
      : []
  );

  return (
    <AdminPanel>
      <AdminSectionHeader
        title="스크린샷 관리"
        rightSide={
          <Button
            as={Link}
            href={`/products/${slug}/screenshots/new`}
            variant="contained"
            color="primary"
            size="sm"
            className="flex items-center gap-1.5"
          >
            <Plus size={16} />
            스크린샷 추가
          </Button>
        }
      />
      <AdminSectionBody>
        {loading ? (
          <AdminLoadingState />
        ) : error ? (
          <AdminErrorState
            error={error}
            action={
              <Button type="button" onClick={() => refetch()} variant="contained" color="primary">
                다시 시도
              </Button>
            }
          />
        ) : screenshots.length === 0 ? (
          <AdminEmptyState
            title="등록된 스크린샷이 없습니다."
            description="서비스의 주요 기능 및 화면을 보여주는 스크린샷을 등록해 보세요."
            action={
              <Button
                as={Link}
                href={`/products/${slug}/screenshots/new`}
                variant="contained"
                color="primary"
                size="sm"
                className="flex items-center gap-1.5"
              >
                <Plus size={16} />
                스크린샷 추가
              </Button>
            }
          />
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3">
            {screenshots.map(screenshot => (
              <div
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
                      disabled={deletingId !== null}
                      className="rounded p-1 text-dark-400 transition hover:bg-surface-100 hover:text-dark-900 disabled:opacity-50"
                      title={editingId === screenshot.id ? '메타데이터 편집 닫기' : '메타데이터 수정'}
                      aria-label={editingId === screenshot.id ? '메타데이터 편집 닫기' : '메타데이터 수정'}
                      aria-expanded={editingId === screenshot.id}
                    >
                      <Pencil size={16} />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(screenshot.id)}
                      disabled={deletingId !== null}
                      className="rounded p-1 text-dark-400 transition hover:bg-red-50 hover:text-red-600 disabled:opacity-50"
                      title={deletingId === screenshot.id ? '삭제 중...' : '스크린샷 삭제'}
                      aria-label={deletingId === screenshot.id ? '삭제 중' : '스크린샷 삭제'}
                    >
                      {deletingId === screenshot.id ? (
                        <Loader2 size={16} className="animate-spin text-red-600 motion-reduce:animate-none" />
                      ) : (
                        <Trash2 size={16} />
                      )}
                    </button>
                  </span>
                </div>
                {editingId === screenshot.id && (
                  <ScreenshotMetadataEditor
                    screenshot={screenshot}
                    slug={slug}
                    onClose={() => setEditingId(current => (current === screenshot.id ? null : current))}
                  />
                )}
              </div>
            ))}
          </div>
        )}
      </AdminSectionBody>
    </AdminPanel>
  );
};

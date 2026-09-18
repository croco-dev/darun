'use client';

import { gql } from '@apollo/client';
import { useMutation, useQuery } from '@apollo/client/react';
import {
  CreateProductFlowOnEditorDocument,
  UpdateProductFlowOnEditorDocument,
  GetProductScreenshotsOnFlowEditorDocument,
  GetProductFlowOnEditorDocument,
  type VisualFlowType,
  type VisualPlatform,
} from '@darun/provider-graphql';
import { ArrowDown, ArrowUp, Button, Check, ImageOff, Loader2, Plus, X } from '@darun/ui';
import { AdminErrorState } from '@darun/ui-admin';
import { notifications } from '@mantine/notifications';
import { useMemo, useState } from 'react';

// eslint-disable-next-line @typescript-eslint/no-unused-expressions
gql`
  query GetProductScreenshotsOnFlowEditor($slug: String!) {
    tempProductBySlug(slug: $slug) {
      id
      screenshots {
        id
        imageUrl
        imageAlt
        title
        platform
      }
    }
  }

  query GetProductFlowOnEditor($id: String!) {
    adminProductFlow(id: $id) {
      id
      title
      description
      platform
      flowType
      steps {
        position
        caption
        screenshot {
          id
          imageUrl
          imageAlt
          title
          platform
        }
      }
    }
  }

  mutation CreateProductFlowOnEditor($input: CreateProductFlowInput!) {
    createProductFlow(input: $input) {
      flow {
        id
      }
    }
  }

  mutation UpdateProductFlowOnEditor($input: UpdateProductFlowInput!) {
    updateProductFlow(input: $input) {
      flow {
        id
      }
    }
  }
`;

type FlowEditorProps = {
  slug: string;
  flowId?: string;
  onSaved: (flowId: string) => void;
  onCancel: () => void;
};

type ScreenshotOption = {
  id: string;
  imageUrl: string;
  imageAlt: string;
  title: string | null;
  platform: string | null;
};

type StepDraft = {
  screenshotId: string;
  caption: string;
};

const PLATFORM_OPTIONS: Array<{ value: VisualPlatform; label: string }> = [
  { value: 'WEB', label: '웹' },
  { value: 'IOS', label: 'iOS' },
  { value: 'ANDROID', label: '안드로이드' },
];

const FLOW_TYPE_OPTIONS: Array<{ value: VisualFlowType; label: string }> = [
  { value: 'ONBOARDING', label: '온보딩' },
  { value: 'SIGN_UP', label: '회원가입' },
  { value: 'SIGN_IN', label: '로그인' },
  { value: 'SEARCH', label: '검색' },
  { value: 'CHECKOUT', label: '결제' },
  { value: 'SETTINGS', label: '설정' },
  { value: 'OTHER', label: '기타' },
];

const MIN_STEPS = 2;
const MAX_STEPS = 50;

function StepImage({ src, alt }: { src: string; alt: string }) {
  const [failed, setFailed] = useState(false);
  if (failed) {
    return (
      <div className="flex h-20 w-32 shrink-0 items-center justify-center rounded-md bg-dark-100 text-dark-500">
        <ImageOff size={18} aria-hidden />
      </div>
    );
  }
  return (
    <img src={src} alt={alt} className="h-20 w-32 shrink-0 rounded-md object-cover" onError={() => setFailed(true)} />
  );
}

export const ProductFlowEditor = ({ slug, flowId, onSaved, onCancel }: FlowEditorProps) => {
  const isEdit = flowId !== undefined;

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [platform, setPlatform] = useState<VisualPlatform>('WEB');
  const [flowType, setFlowType] = useState<VisualFlowType>('ONBOARDING');
  const [steps, setSteps] = useState<StepDraft[]>([]);
  const [hydratedFromServer, setHydratedFromServer] = useState(!isEdit);
  const [saving, setSaving] = useState(false);
  const [pickMode, setPickMode] = useState(false);

  const screenshotsResult = useQuery(GetProductScreenshotsOnFlowEditorDocument, { variables: { slug } });
  const flowResult = useQuery(GetProductFlowOnEditorDocument, {
    variables: { id: flowId ?? '' },
    skip: !isEdit,
  });

  const screenshots: ScreenshotOption[] = useMemo(
    () =>
      (screenshotsResult.data?.tempProductBySlug?.screenshots ?? []).flatMap(shot =>
        shot
          ? [
              {
                id: shot.id ?? '',
                imageUrl: shot.imageUrl ?? '',
                imageAlt: shot.imageAlt ?? '',
                title: shot.title ?? null,
                platform: shot.platform ?? null,
              },
            ]
          : []
      ),
    [screenshotsResult.data]
  );

  const screenshotById = useMemo(() => new Map(screenshots.map(shot => [shot.id, shot])), [screenshots]);

  // 편집 대상 플로를 한 번만 반영한다. 이후 서버 재조회가 로컬 편집 내용을 덮어쓰지 않는다.
  const serverFlow = flowResult.data?.adminProductFlow;
  if (isEdit && !hydratedFromServer && serverFlow) {
    setHydratedFromServer(true);
    setTitle(serverFlow.title ?? '');
    setDescription(serverFlow.description ?? '');
    setPlatform((serverFlow.platform as VisualPlatform) ?? 'WEB');
    setFlowType((serverFlow.flowType as VisualFlowType) ?? 'ONBOARDING');
    setSteps(
      (serverFlow.steps ?? []).flatMap(step =>
        step?.screenshot?.id ? [{ screenshotId: step.screenshot.id, caption: step.caption ?? '' }] : []
      )
    );
  }

  const [createFlow] = useMutation(CreateProductFlowOnEditorDocument);
  const [updateFlow] = useMutation(UpdateProductFlowOnEditorDocument);

  const moveStep = (index: number, direction: -1 | 1) => {
    setSteps(current => {
      const next = [...current];
      const target = index + direction;
      if (target < 0 || target >= next.length) {
        return current;
      }
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  };

  const removeStep = (index: number) => {
    setSteps(current => current.filter((_, i) => i !== index));
  };

  const addStep = (screenshotId: string) => {
    setSteps(current =>
      current.some(step => step.screenshotId === screenshotId) || current.length >= MAX_STEPS
        ? current
        : [...current, { screenshotId, caption: '' }]
    );
    setPickMode(false);
  };

  const updateCaption = (index: number, caption: string) => {
    setSteps(current => current.map((step, i) => (i === index ? { ...step, caption } : step)));
  };

  const usableScreenshots = screenshots.filter(shot => shot.platform === platform);
  const pickedIds = new Set(steps.map(step => step.screenshotId));
  const selectableScreenshots = usableScreenshots.filter(shot => !pickedIds.has(shot.id));

  const canSave =
    hydratedFromServer && !saving && title.trim().length > 0 && steps.length >= MIN_STEPS && steps.length <= MAX_STEPS;

  const handleSave = async () => {
    if (!canSave) {
      return;
    }
    const input = {
      title: title.trim(),
      description: description.trim(),
      platform,
      flowType,
      steps: steps.map(step => ({ screenshotId: step.screenshotId, caption: step.caption.trim() })),
    };
    setSaving(true);
    try {
      if (isEdit && flowId) {
        await updateFlow({ variables: { input: { id: flowId, ...input } } });
        onSaved(flowId);
      } else {
        const result = await createFlow({ variables: { input: { productSlug: slug, ...input } } });
        const newId = result.data?.createProductFlow?.flow?.id;
        onSaved(newId ?? '');
      }
    } catch {
      // 실패 시 편집 내용을 보존한다. 오류 안내만 표시한다.
      notifications.show({
        title: '저장 실패',
        message: '플로를 저장하지 못했습니다. 입력 내용을 확인한 뒤 다시 시도해 주세요.',
        color: 'red',
      });
    } finally {
      setSaving(false);
    }
  };

  if (isEdit && flowResult.loading) {
    return (
      <div className="flex items-center justify-center py-16 text-dark-500">
        <Loader2 size={24} className="animate-spin motion-reduce:animate-none" aria-label="플로 불러오는 중" />
      </div>
    );
  }

  if (isEdit && flowResult.error && !serverFlow) {
    return (
      <AdminErrorState
        title="플로를 불러오지 못했습니다."
        error={flowResult.error}
        action={
          <Button type="button" variant="contained" color="primary" onClick={() => flowResult.refetch()}>
            다시 시도
          </Button>
        }
      />
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-4 rounded-lg border border-dark-200 bg-surface-100/30 p-4">
        <label className="flex flex-col gap-1.5 text-sm font-medium text-dark-900">
          제목
          <input
            type="text"
            value={title}
            onChange={e => setTitle(e.target.value)}
            maxLength={100}
            placeholder="예: 회원가입"
            className="rounded-md border border-dark-300 bg-surface-50 px-3 py-2 text-sm font-normal text-dark-900 placeholder:text-dark-400 focus:border-primary-500 focus:outline-none"
          />
        </label>
        <label className="flex flex-col gap-1.5 text-sm font-medium text-dark-900">
          설명
          <textarea
            value={description}
            onChange={e => setDescription(e.target.value)}
            maxLength={2000}
            rows={3}
            placeholder="플로가 보여주는 흐름을 설명해 주세요."
            className="rounded-md border border-dark-300 bg-surface-50 px-3 py-2 text-sm font-normal text-dark-900 placeholder:text-dark-400 focus:border-primary-500 focus:outline-none"
          />
        </label>
        <div className="flex flex-wrap gap-4">
          <label className="flex flex-col gap-1.5 text-sm font-medium text-dark-900">
            플랫폼
            <select
              value={platform}
              onChange={e => {
                setPlatform(e.target.value as VisualPlatform);
                setSteps(current =>
                  current.filter(step => screenshotById.get(step.screenshotId)?.platform === e.target.value)
                );
              }}
              className="rounded-md border border-dark-300 bg-surface-50 px-3 py-2 text-sm font-normal text-dark-900 focus:border-primary-500 focus:outline-none"
            >
              {PLATFORM_OPTIONS.map(option => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1.5 text-sm font-medium text-dark-900">
            플로 유형
            <select
              value={flowType}
              onChange={e => setFlowType(e.target.value as VisualFlowType)}
              className="rounded-md border border-dark-300 bg-surface-50 px-3 py-2 text-sm font-normal text-dark-900 focus:border-primary-500 focus:outline-none"
            >
              {FLOW_TYPE_OPTIONS.map(option => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
        </div>
      </div>

      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-dark-900">
            단계{' '}
            <span className="font-normal text-dark-500">
              ({steps.length}/{MAX_STEPS})
            </span>
          </h2>
          <Button
            type="button"
            variant="base"
            color="primary"
            size="sm"
            onClick={() => setPickMode(current => !current)}
            className="flex items-center gap-1.5"
            disabled={steps.length >= MAX_STEPS || selectableScreenshots.length === 0}
          >
            <Plus size={16} />
            단계 추가
          </Button>
        </div>
        {steps.length < MIN_STEPS && (
          <p className="text-sm text-dark-500" role="status">
            플로는 {MIN_STEPS}단계 이상으로 구성해 주세요.
          </p>
        )}
        {pickMode && (
          <div className="grid grid-cols-2 gap-2 rounded-lg border border-dark-200 bg-surface-100/50 p-3 sm:grid-cols-3 md:grid-cols-4">
            {selectableScreenshots.map(shot => (
              <button
                key={shot.id}
                type="button"
                onClick={() => addStep(shot.id)}
                className="group flex flex-col gap-1 rounded-md border border-dark-200 bg-surface-50 p-1.5 text-left transition hover:border-primary-400"
              >
                <StepImage src={shot.imageUrl} alt={shot.imageAlt || '스크린샷'} />
                <span className="truncate text-xs font-medium text-dark-700">{shot.title ?? shot.imageAlt}</span>
              </button>
            ))}
            {selectableScreenshots.length === 0 && (
              <p className="col-span-full py-2 text-center text-sm text-dark-500">
                이 플랫폼에서 추가로 사용할 수 있는 스크린샷이 없습니다.
              </p>
            )}
          </div>
        )}
        <ol className="flex flex-col gap-2">
          {steps.map((step, index) => {
            const shot = screenshotById.get(step.screenshotId);
            return (
              <li
                key={step.screenshotId}
                className="flex flex-col gap-3 rounded-lg border border-dark-200 bg-surface-100/30 p-3 sm:flex-row sm:items-center"
              >
                <div className="flex items-center gap-3 sm:w-48 sm:shrink-0">
                  {shot ? <StepImage src={shot.imageUrl} alt={shot.imageAlt || '단계 스크린샷'} /> : null}
                  <div className="flex min-w-0 flex-col">
                    <span className="text-xs font-semibold text-dark-400">단계 {index + 1}</span>
                    <span className="truncate text-sm font-medium text-dark-900">
                      {shot?.title ?? shot?.imageAlt ?? '스크린샷'}
                    </span>
                  </div>
                </div>
                <input
                  type="text"
                  value={step.caption}
                  onChange={e => updateCaption(index, e.target.value)}
                  maxLength={300}
                  placeholder="이 단계에서 일어나는 일 (최대 300자)"
                  aria-label={`단계 ${index + 1} 설명`}
                  className="flex-1 rounded-md border border-dark-300 bg-surface-50 px-3 py-2 text-sm text-dark-900 placeholder:text-dark-400 focus:border-primary-500 focus:outline-none"
                />
                <div className="flex shrink-0 items-center gap-1">
                  <button
                    type="button"
                    onClick={() => moveStep(index, -1)}
                    disabled={index === 0}
                    className="rounded p-1.5 text-dark-400 transition hover:bg-surface-100 hover:text-dark-900 disabled:opacity-40"
                    title="위로 이동"
                    aria-label={`단계 ${index + 1} 위로 이동`}
                  >
                    <ArrowUp size={16} />
                  </button>
                  <button
                    type="button"
                    onClick={() => moveStep(index, 1)}
                    disabled={index === steps.length - 1}
                    className="rounded p-1.5 text-dark-400 transition hover:bg-surface-100 hover:text-dark-900 disabled:opacity-40"
                    title="아래로 이동"
                    aria-label={`단계 ${index + 1} 아래로 이동`}
                  >
                    <ArrowDown size={16} />
                  </button>
                  <button
                    type="button"
                    onClick={() => removeStep(index)}
                    className="rounded p-1.5 text-dark-400 transition hover:bg-cherry-50 hover:text-cherry-600"
                    title="단계 제거"
                    aria-label={`단계 ${index + 1} 제거`}
                  >
                    <X size={16} />
                  </button>
                </div>
              </li>
            );
          })}
        </ol>
      </div>

      <div className="flex items-center justify-end gap-2">
        <Button type="button" variant="text" color="secondary" onClick={onCancel} disabled={saving}>
          취소
        </Button>
        <Button
          type="button"
          variant="contained"
          color="primary"
          onClick={handleSave}
          disabled={!canSave}
          className="flex items-center gap-1.5"
        >
          {saving ? (
            <Loader2 size={16} className="animate-spin motion-reduce:animate-none" aria-label="저장 중" />
          ) : (
            <Check size={16} />
          )}
          {isEdit ? '플로 수정' : '플로 등록'}
        </Button>
      </div>
    </div>
  );
};

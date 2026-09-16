'use client';

import { gql } from '@apollo/client';
import { useMutation, useQuery } from '@apollo/client/react';
import {
  GetLlmSettingOnLlmSettingFormSectionDocument,
  UpdateLlmSettingOnLlmSettingFormSectionDocument,
} from '@darun/provider-graphql';
import { Button } from '@darun/ui';
import {
  AdminErrorState,
  AdminInput,
  AdminLoadingState,
  AdminPanel,
  AdminSectionBody,
  AdminSectionHeader,
} from '@darun/ui-admin';
import { DEFAULT_LLM_ENDPOINT, DEFAULT_LLM_MODEL } from '@darun/utils-llm';
import { useDisclosure } from '@mantine/hooks';
import { notifications } from '@mantine/notifications';
import { Search } from 'lucide-react';
import { useState } from 'react';
import { ModelSelectModal } from './ModelSelectModal';

// eslint-disable-next-line @typescript-eslint/no-unused-expressions
gql`
  query GetLlmSettingOnLlmSettingFormSection {
    llmSetting {
      id
      endpoint
      apiKeyMasked
      model
      thinkingLevel
      updatedAt
    }
  }
`;

// eslint-disable-next-line @typescript-eslint/no-unused-expressions
gql`
  mutation UpdateLlmSettingOnLlmSettingFormSection(
    $endpoint: String
    $apiKey: String
    $model: String
    $thinkingLevel: String
  ) {
    updateLlmSetting(endpoint: $endpoint, apiKey: $apiKey, model: $model, thinkingLevel: $thinkingLevel) {
      id
      endpoint
      apiKeyMasked
      model
      thinkingLevel
      updatedAt
    }
  }
`;

export function LlmSettingFormSection() {
  const { data, loading, error, refetch } = useQuery(GetLlmSettingOnLlmSettingFormSectionDocument);

  if (loading) {
    return <AdminLoadingState />;
  }

  if (error) {
    return (
      <AdminErrorState
        title="설정을 불러오지 못했습니다"
        error={error}
        action={
          <Button type="button" onClick={() => refetch()} variant="contained" color="primary">
            다시 시도
          </Button>
        }
      />
    );
  }

  const currentSetting = data?.llmSetting;

  return (
    <AdminPanel>
      <AdminSectionHeader title="LLM API 연동 및 모델 설정" />
      <AdminSectionBody>
        <p className="text-sm text-dark-500 mb-2">
          번역 및 콘텐츠 자동 생성에 사용할 LLM 엔드포인트, API 키, 기본 모델을 데이터베이스에 동적으로 설정합니다.
        </p>
        <LlmSettingForm
          key={currentSetting?.updatedAt ?? 'default'}
          currentSetting={currentSetting}
          onUpdated={refetch}
        />
      </AdminSectionBody>
    </AdminPanel>
  );
}

type LlmSettingData = {
  id: string;
  endpoint: string;
  apiKeyMasked?: string | null;
  model: string;
  thinkingLevel?: string | null;
  updatedAt: string;
};

export function resolveLlmFormDefaults(
  setting?: Partial<Pick<LlmSettingData, 'endpoint' | 'model' | 'thinkingLevel'>>
) {
  return {
    endpoint: setting?.endpoint || DEFAULT_LLM_ENDPOINT,
    model: setting?.model || DEFAULT_LLM_MODEL,
    thinkingLevel: setting?.thinkingLevel ?? '',
  };
}

function formatUpdatedAt(dateStr?: string | null): string | null {
  if (!dateStr) return null;
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleString('ko-KR');
}

function LlmSettingForm({
  currentSetting,
  onUpdated,
}: {
  currentSetting?: LlmSettingData;
  onUpdated: () => Promise<unknown>;
}) {
  const [updateLlmSetting, { loading: isUpdating }] = useMutation(UpdateLlmSettingOnLlmSettingFormSectionDocument);

  const defaults = resolveLlmFormDefaults(currentSetting);
  const [endpoint, setEndpoint] = useState(defaults.endpoint);
  const [apiKey, setApiKey] = useState('');
  const [clearApiKey, setClearApiKey] = useState(false);
  const [model, setModel] = useState(defaults.model);
  const [thinkingLevel, setThinkingLevel] = useState(defaults.thinkingLevel);
  const [isModelModalOpened, { open: openModelModal, close: closeModelModal }] = useDisclosure(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isUpdating) {
      return;
    }

    if (endpoint.trim()) {
      try {
        const url = new URL(endpoint.trim());
        if (url.protocol !== 'http:' && url.protocol !== 'https:') {
          notifications.show({
            title: '유효하지 않은 URL',
            message: 'API 엔드포인트는 http:// 또는 https:// 로 시작해야 합니다.',
            color: 'red',
          });
          return;
        }
      } catch {
        notifications.show({
          title: '유효하지 않은 URL',
          message: '올바른 URL 형식(예: https://openrouter.ai/api/v1)으로 입력해주세요.',
          color: 'red',
        });
        return;
      }
    }

    try {
      const resolvedApiKey = clearApiKey ? '' : apiKey.trim() || undefined;
      await updateLlmSetting({
        variables: {
          endpoint: endpoint.trim() || undefined,
          apiKey: resolvedApiKey,
          model: model.trim() || undefined,
          thinkingLevel: thinkingLevel.trim(),
        },
      });

      notifications.show({
        message: 'LLM 설정이 데이터베이스에 안전하게 저장되었습니다.',
        color: 'teal',
      });
      setClearApiKey(false);
      setApiKey('');
      await onUpdated();
    } catch (err) {
      notifications.show({
        title: '저장 실패',
        message: err instanceof Error ? err.message : '알 수 없는 오류',
        color: 'red',
      });
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-6 max-w-2xl">
      <div className="flex flex-col gap-1.5">
        <label htmlFor="endpoint" className="text-sm font-medium text-dark-800">
          API 엔드포인트 URL
        </label>
        <AdminInput
          id="endpoint"
          type="text"
          value={endpoint}
          disabled={isUpdating}
          onChange={e => setEndpoint(e.target.value)}
          placeholder="https://openrouter.ai/api/v1"
          aria-describedby="endpoint-help"
          required
        />
        <p id="endpoint-help" className="text-xs text-dark-500">
          OpenAI 호환 API 엔드포인트입니다. (기본값: https://openrouter.ai/api/v1)
        </p>
      </div>

      <div className="flex flex-col gap-1.5">
        <div className="flex items-center justify-between">
          <label htmlFor="apiKey" className="text-sm font-medium text-dark-800">
            API 키 (Secret Key)
          </label>
          {currentSetting?.apiKeyMasked && !clearApiKey && (
            <button
              type="button"
              disabled={isUpdating}
              onClick={() => {
                setClearApiKey(true);
                setApiKey('');
              }}
              className="text-xs text-red-600 hover:text-red-700 underline disabled:opacity-50"
            >
              DB 등록 키 삭제
            </button>
          )}
          {clearApiKey && (
            <button
              type="button"
              disabled={isUpdating}
              onClick={() => setClearApiKey(false)}
              className="text-xs text-dark-600 hover:text-dark-800 underline disabled:opacity-50"
            >
              삭제 취소
            </button>
          )}
        </div>
        {clearApiKey ? (
          <div className="rounded-lg border border-red-200 bg-red-50 p-2.5 text-xs text-red-700">
            DB에 등록된 API 키가 저장 시 삭제됩니다. (기본 환경변수 OPEN_ROUTER_API_KEY 로 복원됨)
          </div>
        ) : (
          <AdminInput
            id="apiKey"
            type="password"
            value={apiKey}
            disabled={isUpdating}
            onChange={e => setApiKey(e.target.value)}
            aria-describedby="apiKey-help"
            placeholder={
              currentSetting?.apiKeyMasked
                ? `현재 등록됨 (${currentSetting.apiKeyMasked}) - 변경 시에만 입력`
                : '등록된 키 없음 (입력하지 않으면 환경변수 OPEN_ROUTER_API_KEY 사용)'
            }
          />
        )}
        <p id="apiKey-help" className="text-xs text-dark-500">
          새 API 키를 입력하면 DB에 갱신됩니다. 비워두면 기존 등록된 키 또는 환경변수가 유지됩니다.
        </p>
      </div>

      <div className="flex flex-col gap-1.5">
        <div className="flex items-center justify-between">
          <label htmlFor="model" className="text-sm font-medium text-dark-800">
            사용할 LLM 모델명
          </label>
          <button
            type="button"
            onClick={openModelModal}
            disabled={isUpdating}
            className="inline-flex items-center gap-1 text-xs font-semibold text-dark-800 hover:text-dark-950 px-2 py-0.5 rounded bg-dark-100 hover:bg-dark-200 transition disabled:opacity-50"
          >
            <Search className="w-3.5 h-3.5" />
            /v1/models 검색 및 선택
          </button>
        </div>
        <div className="flex gap-2">
          <AdminInput
            id="model"
            type="text"
            value={model}
            disabled={isUpdating}
            onChange={e => setModel(e.target.value)}
            placeholder="nvidia/nemotron-3-ultra-550b-a55b:free"
            className="flex-1 font-mono"
            aria-describedby="model-help"
            required
          />
          <button
            type="button"
            onClick={openModelModal}
            disabled={isUpdating}
            className="px-3.5 py-2 rounded-lg bg-dark-900 hover:bg-dark-800 text-white text-sm font-medium transition whitespace-nowrap flex items-center gap-1.5 disabled:opacity-60"
          >
            <Search className="w-4 h-4" />
            목록에서 찾기
          </button>
        </div>
        <div className="flex flex-wrap items-center gap-1.5 mt-1">
          <span className="text-xs text-dark-500">빠른 선택:</span>
          {[
            { label: 'gemini-2.5-flash (빠름)', value: 'google/gemini-2.5-flash' },
            { label: 'grok-4-fast (빠름)', value: 'x-ai/grok-4-fast' },
            { label: 'gpt-4o-mini (빠름)', value: 'openai/gpt-4o-mini' },
            { label: 'nemotron free (무료)', value: 'nvidia/nemotron-3-ultra-550b-a55b:free' },
          ].map(opt => (
            <button
              key={opt.value}
              type="button"
              disabled={isUpdating}
              onClick={() => setModel(opt.value)}
              className="text-xs px-2 py-0.5 rounded bg-dark-100 hover:bg-dark-200 disabled:opacity-50 text-dark-800 font-mono transition"
            >
              {opt.label}
            </button>
          ))}
        </div>
        <p id="model-help" className="sr-only">
          OpenRouter 등에서 지원하는 LLM 모델 식별자입니다.
        </p>
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="thinkingLevel" className="text-sm font-medium text-dark-800">
          추론 강도 (Thinking Level / Reasoning Effort)
        </label>
        <AdminInput
          id="thinkingLevel"
          type="text"
          value={thinkingLevel}
          disabled={isUpdating}
          onChange={e => setThinkingLevel(e.target.value)}
          placeholder="예: low, medium, high, none (비워두면 모델 기본값)"
          aria-describedby="thinkingLevel-help"
        />
        <div className="flex flex-wrap items-center gap-1.5 mt-1">
          <span className="text-xs text-dark-500">빠른 선택:</span>
          {[
            { label: '기본값', value: '' },
            { label: 'none (추론 끄기)', value: 'none' },
            { label: 'minimal', value: 'minimal' },
            { label: 'low', value: 'low' },
            { label: 'medium', value: 'medium' },
            { label: 'high', value: 'high' },
            { label: 'max', value: 'max' },
          ].map(opt => (
            <button
              key={opt.label}
              type="button"
              disabled={isUpdating}
              onClick={() => setThinkingLevel(opt.value)}
              className={`text-xs px-2 py-0.5 rounded font-mono transition border disabled:opacity-50 ${
                thinkingLevel === opt.value
                  ? 'bg-dark-900 text-white border-dark-900'
                  : 'bg-dark-50 hover:bg-dark-100 text-dark-700 border-dark-200'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
        <p id="thinkingLevel-help" className="text-xs text-dark-500">
          OpenRouter/Gemini/OpenAI 추론 모델(o-series, Claude thinking, Gemini 3 thinkingLevel, Nemotron 등)에 적용되는
          추론 강도입니다.
        </p>
      </div>

      <div className="flex items-center justify-between pt-4 border-t border-dark-100">
        <div className="text-xs text-dark-400">
          {formatUpdatedAt(currentSetting?.updatedAt) && (
            <span>마지막 변경: {formatUpdatedAt(currentSetting?.updatedAt)}</span>
          )}
        </div>
        <Button type="submit" variant="contained" color="primary" disabled={isUpdating}>
          {isUpdating ? '저장 중...' : '설정 저장'}
        </Button>
      </div>

      <ModelSelectModal
        opened={isModelModalOpened}
        onClose={closeModelModal}
        endpoint={endpoint}
        apiKey={apiKey}
        selectedModel={model}
        onSelectModel={setModel}
      />
    </form>
  );
}

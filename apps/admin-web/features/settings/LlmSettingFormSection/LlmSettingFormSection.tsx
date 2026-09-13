'use client';

import { gql } from '@apollo/client';
import { useMutation, useQuery } from '@apollo/client/react';
import {
  GetLlmSettingOnLlmSettingFormSectionDocument,
  UpdateLlmSettingOnLlmSettingFormSectionDocument,
} from '@darun/provider-graphql';
import { Button } from '@darun/ui';
import { AdminErrorState, AdminLoadingState, AdminPanel, AdminSectionBody, AdminSectionHeader } from '@darun/ui-admin';
import { notifications } from '@mantine/notifications';
import { useState } from 'react';

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

function LlmSettingForm({
  currentSetting,
  onUpdated,
}: {
  currentSetting?: LlmSettingData;
  onUpdated: () => Promise<unknown>;
}) {
  const [updateLlmSetting, { loading: isUpdating }] = useMutation(UpdateLlmSettingOnLlmSettingFormSectionDocument);

  const [endpoint, setEndpoint] = useState(currentSetting?.endpoint ?? '');
  const [apiKey, setApiKey] = useState('');
  const [model, setModel] = useState(currentSetting?.model ?? '');
  const [thinkingLevel, setThinkingLevel] = useState(currentSetting?.thinkingLevel ?? '');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      await updateLlmSetting({
        variables: {
          endpoint: endpoint.trim() || undefined,
          apiKey: apiKey.trim() || undefined,
          model: model.trim() || undefined,
          thinkingLevel: thinkingLevel.trim() || undefined,
        },
      });

      notifications.show({
        message: 'LLM 설정이 데이터베이스에 안전하게 저장되었습니다.',
        color: 'teal',
      });
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
        <input
          id="endpoint"
          type="text"
          value={endpoint}
          onChange={e => setEndpoint(e.target.value)}
          placeholder="https://openrouter.ai/api/v1"
          className="px-3.5 py-2 rounded-lg border border-dark-200 bg-white text-dark-900 text-sm focus:outline-none focus:ring-2 focus:ring-dark-900/30"
          required
        />
        <p className="text-xs text-dark-500">
          OpenAI 호환 API 엔드포인트입니다. (기본값: https://openrouter.ai/api/v1)
        </p>
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="apiKey" className="text-sm font-medium text-dark-800">
          API 키 (Secret Key)
        </label>
        <input
          id="apiKey"
          type="password"
          value={apiKey}
          onChange={e => setApiKey(e.target.value)}
          placeholder={
            currentSetting?.apiKeyMasked
              ? `현재 등록됨 (${currentSetting.apiKeyMasked}) - 변경 시에만 입력`
              : '등록된 키 없음 (입력하지 않으면 환경변수 OPEN_ROUTER_API_KEY 사용)'
          }
          className="px-3.5 py-2 rounded-lg border border-dark-200 bg-white text-dark-900 text-sm focus:outline-none focus:ring-2 focus:ring-dark-900/30"
        />
        <p className="text-xs text-dark-500">
          새 API 키를 입력하면 DB에 갱신됩니다. 비워두면 기존 등록된 키 또는 환경변수가 유지됩니다.
        </p>
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="model" className="text-sm font-medium text-dark-800">
          사용할 LLM 모델명
        </label>
        <input
          id="model"
          type="text"
          value={model}
          onChange={e => setModel(e.target.value)}
          placeholder="nvidia/nemotron-3-ultra-550b-a55b:free"
          className="px-3.5 py-2 rounded-lg border border-dark-200 bg-white text-dark-900 text-sm focus:outline-none focus:ring-2 focus:ring-dark-900/30"
          required
        />
        <div className="flex items-center gap-2 mt-1">
          <span className="text-xs text-dark-500">추천 모델:</span>
          <button
            type="button"
            onClick={() => setModel('nvidia/nemotron-3-ultra-550b-a55b:free')}
            className="text-xs px-2 py-0.5 rounded bg-dark-100 hover:bg-dark-200 text-dark-800 font-mono transition"
          >
            nvidia/nemotron-3-ultra-550b-a55b:free
          </button>
          <button
            type="button"
            onClick={() => setModel('x-ai/grok-4-fast')}
            className="text-xs px-2 py-0.5 rounded bg-dark-100 hover:bg-dark-200 text-dark-800 font-mono transition"
          >
            x-ai/grok-4-fast
          </button>
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="thinkingLevel" className="text-sm font-medium text-dark-800">
          추론 강도 (Thinking Level / Reasoning Effort)
        </label>
        <input
          id="thinkingLevel"
          type="text"
          value={thinkingLevel}
          onChange={e => setThinkingLevel(e.target.value)}
          placeholder="예: low, medium, high, none (비워두면 모델 기본값)"
          className="px-3.5 py-2 rounded-lg border border-dark-200 bg-white text-dark-900 text-sm focus:outline-none focus:ring-2 focus:ring-dark-900/30"
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
              onClick={() => setThinkingLevel(opt.value)}
              className={`text-xs px-2 py-0.5 rounded font-mono transition border ${
                thinkingLevel === opt.value
                  ? 'bg-dark-900 text-white border-dark-900'
                  : 'bg-dark-50 hover:bg-dark-100 text-dark-700 border-dark-200'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
        <p className="text-xs text-dark-500">
          OpenRouter/Gemini/OpenAI 추론 모델(o-series, Claude thinking, Gemini 3 thinkingLevel, Nemotron 등)에 적용되는
          추론 강도입니다.
        </p>
      </div>

      <div className="flex items-center justify-between pt-4 border-t border-dark-100">
        <div className="text-xs text-dark-400">
          {currentSetting?.updatedAt && (
            <span>마지막 변경: {new Date(currentSetting.updatedAt).toLocaleString('ko-KR')}</span>
          )}
        </div>
        <Button type="submit" variant="contained" color="primary" disabled={isUpdating}>
          {isUpdating ? '저장 중...' : '설정 저장'}
        </Button>
      </div>
    </form>
  );
}

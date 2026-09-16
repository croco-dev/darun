'use client';

import { AdminModal } from '@darun/ui-admin';
import { AlertCircle, Check, Loader2, RefreshCw, Search, X, Zap } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';

export type LlmModelItem = {
  id: string;
  name?: string;
  description?: string;
  context_length?: number;
  pricing?: {
    prompt?: string;
    completion?: string;
  };
};

export type ModelSelectModalProps = {
  opened: boolean;
  onClose: () => void;
  endpoint: string;
  apiKey?: string;
  selectedModel: string;
  onSelectModel: (modelId: string) => void;
};

const FAST_RECOMMENDED_MODELS = [
  'google/gemini-2.5-flash',
  'google/gemini-2.0-flash-001',
  'x-ai/grok-4-fast',
  'openai/gpt-4o-mini',
  'anthropic/claude-3.5-haiku',
  'meta-llama/llama-3.3-70b-instruct',
];

const CATEGORIES = [
  { id: 'all', label: '전체' },
  { id: 'fast', label: '⚡ 빠른 추천 (타임아웃 방지)' },
  { id: 'free', label: '무료 (:free)' },
  { id: 'google', label: 'Google (Gemini)' },
  { id: 'openai', label: 'OpenAI (GPT)' },
  { id: 'anthropic', label: 'Anthropic (Claude)' },
  { id: 'xai', label: 'xAI (Grok)' },
  { id: 'deepseek', label: 'DeepSeek' },
  { id: 'meta', label: 'Meta (Llama)' },
] as const;

export function ModelSelectModal({
  opened,
  onClose,
  endpoint,
  apiKey,
  selectedModel,
  onSelectModel,
}: ModelSelectModalProps) {
  const [models, setModels] = useState<LlmModelItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  const fetchModels = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    const normalizedEndpoint = (endpoint.trim() || 'https://openrouter.ai/api/v1').replace(/\/+$/, '');
    const directUrl = normalizedEndpoint.endsWith('/models') ? normalizedEndpoint : `${normalizedEndpoint}/models`;

    try {
      let data: unknown = null;

      // 1. Try Next.js API route proxy (bypasses browser CORS & uses server env key if needed)
      try {
        const proxyRes = await fetch('/api/llm/models', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ endpoint: normalizedEndpoint, apiKey: apiKey?.trim() || undefined }),
        });

        if (proxyRes.ok) {
          data = await proxyRes.json();
        }
      } catch {
        // Fallback to direct fetch
      }

      // 2. If proxy didn't return data, fallback to direct fetch
      if (!data) {
        const directHeaders: Record<string, string> = { Accept: 'application/json' };
        if (apiKey?.trim()) {
          directHeaders['Authorization'] = `Bearer ${apiKey.trim()}`;
        }
        const directRes = await fetch(directUrl, { headers: directHeaders });
        if (!directRes.ok) {
          const errText = await directRes.text();
          throw new Error(`HTTP ${directRes.status}: ${errText.slice(0, 150)}`);
        }
        data = await directRes.json();
      }

      const rawList: unknown[] =
        data && typeof data === 'object' && 'data' in data && Array.isArray((data as { data: unknown[] }).data)
          ? (data as { data: unknown[] }).data
          : Array.isArray(data)
            ? data
            : [];

      const parsedModels: LlmModelItem[] = rawList
        .filter((item): item is Record<string, unknown> => item !== null && typeof item === 'object' && 'id' in item)
        .map(item => ({
          id: String(item['id']),
          name: typeof item['name'] === 'string' ? item['name'] : undefined,
          description: typeof item['description'] === 'string' ? item['description'] : undefined,
          context_length: typeof item['context_length'] === 'number' ? item['context_length'] : undefined,
          pricing:
            item['pricing'] && typeof item['pricing'] === 'object'
              ? {
                  prompt:
                    typeof (item['pricing'] as Record<string, unknown>)['prompt'] === 'string'
                      ? ((item['pricing'] as Record<string, unknown>)['prompt'] as string)
                      : undefined,
                  completion:
                    typeof (item['pricing'] as Record<string, unknown>)['completion'] === 'string'
                      ? ((item['pricing'] as Record<string, unknown>)['completion'] as string)
                      : undefined,
                }
              : undefined,
        }));

      if (!parsedModels.length) {
        throw new Error('조회된 모델 목록이 비어 있습니다. 엔드포인트 URL을 확인해주세요.');
      }

      setModels(parsedModels);
    } catch (err) {
      setError(err instanceof Error ? err.message : '모델 목록을 불러오지 못했습니다.');
    } finally {
      setIsLoading(false);
    }
  }, [endpoint, apiKey]);

  useEffect(() => {
    if (!opened || models.length > 0) return;

    let ignore = false;
    const timer = setTimeout(() => {
      if (!ignore) {
        void fetchModels();
      }
    }, 0);

    return () => {
      ignore = true;
      clearTimeout(timer);
    };
  }, [opened, models.length, fetchModels]);

  const filteredModels = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();

    return models.filter(m => {
      // Category filter
      if (selectedCategory === 'fast') {
        const isFastPreset = FAST_RECOMMENDED_MODELS.some(preset => m.id.includes(preset));
        const isFlashOrFast = m.id.includes('flash') || m.id.includes('mini') || m.id.includes('fast');
        if (!isFastPreset && !isFlashOrFast) return false;
      } else if (selectedCategory === 'free') {
        if (!m.id.includes(':free')) return false;
      } else if (selectedCategory === 'google') {
        if (!m.id.includes('google') && !m.name?.toLowerCase().includes('gemini')) return false;
      } else if (selectedCategory === 'openai') {
        if (!m.id.includes('openai') && !m.name?.toLowerCase().includes('gpt')) return false;
      } else if (selectedCategory === 'anthropic') {
        if (!m.id.includes('anthropic') && !m.name?.toLowerCase().includes('claude')) return false;
      } else if (selectedCategory === 'xai') {
        if (!m.id.includes('x-ai') && !m.name?.toLowerCase().includes('grok')) return false;
      } else if (selectedCategory === 'deepseek') {
        if (!m.id.toLowerCase().includes('deepseek') && !m.name?.toLowerCase().includes('deepseek')) return false;
      } else if (selectedCategory === 'meta') {
        if (!m.id.includes('meta') && !m.id.includes('llama') && !m.name?.toLowerCase().includes('llama')) return false;
      }

      // Search query filter
      if (!q) return true;
      const idMatch = m.id.toLowerCase().includes(q);
      const nameMatch = m.name?.toLowerCase().includes(q) ?? false;
      const descMatch = m.description?.toLowerCase().includes(q) ?? false;
      return idMatch || nameMatch || descMatch;
    });
  }, [models, searchQuery, selectedCategory]);

  const handleSelect = (modelId: string) => {
    onSelectModel(modelId);
    onClose();
  };

  return (
    <AdminModal opened={opened} onClose={onClose} title="LLM 모델 조회 및 선택 (/v1/models)" maxWidth="max-w-3xl">
      <div className="flex flex-col gap-4">
        {/* Endpoint Information & Timeout Notice */}
        <div className="p-3 bg-dark-50 rounded-xl border border-dark-100 flex flex-col gap-1.5">
          <div className="flex items-center justify-between text-xs text-dark-600">
            <span className="font-medium truncate">
              엔드포인트: <span className="font-mono text-dark-900">{endpoint || 'https://openrouter.ai/api/v1'}</span>
            </span>
            <button
              type="button"
              onClick={() => void fetchModels()}
              disabled={isLoading}
              className="flex items-center gap-1 text-dark-700 hover:text-dark-900 font-medium px-2 py-0.5 rounded hover:bg-dark-200 transition disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
              새로고침
            </button>
          </div>
          <div className="flex items-start gap-1.5 text-xs text-amber-800 bg-amber-50 p-2 rounded-lg border border-amber-200">
            <Zap className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <span>
              <strong>30초 타임아웃 방지 팁:</strong> 거대 무료 모델(`:free`)이나 추론 모델은 대기열 및 생각 시간으로
              인해 번역 요청 시 20~30초 제한을 초과하기 쉽습니다. 빠른 속도(2~5초)를 지원하는{' '}
              <strong>Gemini Flash, Grok Fast, GPT-4o-mini</strong> 등을 선택하시면 안정적으로 번역됩니다.
            </span>
          </div>
        </div>

        {/* Search Input */}
        <div className="relative">
          <Search className="w-4 h-4 text-dark-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="모델명 또는 모델 ID 검색 (예: gemini, claude, gpt, grok, llama)..."
            className="w-full pl-9 pr-9 py-2 rounded-lg border border-dark-200 bg-white text-dark-900 text-sm focus:outline-none focus:ring-2 focus:ring-dark-900/30"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-dark-400 hover:text-dark-700"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Category Pills */}
        <div className="flex flex-wrap items-center gap-1.5">
          {CATEGORIES.map(cat => {
            const isSelected = selectedCategory === cat.id;
            return (
              <button
                key={cat.id}
                type="button"
                onClick={() => setSelectedCategory(cat.id)}
                className={`text-xs px-2.5 py-1 rounded-full border transition font-medium ${
                  isSelected
                    ? 'bg-dark-900 text-white border-dark-900'
                    : 'bg-white hover:bg-dark-50 text-dark-700 border-dark-200'
                }`}
              >
                {cat.label}
              </button>
            );
          })}
        </div>

        {/* Status / Count bar */}
        <div className="flex items-center justify-between text-xs text-dark-500">
          <span>
            {isLoading ? (
              <span className="flex items-center gap-1.5">
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                모델 목록을 불러오는 중...
              </span>
            ) : (
              <span>
                검색 결과: <strong>{filteredModels.length}</strong>개{' '}
                {models.length > 0 && <span className="text-dark-400">(전체 {models.length}개)</span>}
              </span>
            )}
          </span>
          {selectedModel && (
            <span className="truncate max-w-xs">
              현재 선택: <span className="font-mono font-medium text-dark-900">{selectedModel}</span>
            </span>
          )}
        </div>

        {/* Error View */}
        {error && (
          <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-red-800 flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
            <div className="flex-1">
              <div className="text-sm font-semibold">모델 목록 조회 실패</div>
              <div className="text-xs text-red-700 mt-0.5">{error}</div>
              <button
                type="button"
                onClick={() => void fetchModels()}
                className="mt-2 text-xs font-medium text-red-900 bg-red-100 hover:bg-red-200 px-2.5 py-1 rounded transition"
              >
                다시 시도
              </button>
            </div>
          </div>
        )}

        {/* Model List View */}
        {!isLoading && !error && (
          <div className="max-h-[48vh] overflow-y-auto space-y-2 pr-1">
            {filteredModels.length === 0 ? (
              <div className="py-12 text-center text-sm text-dark-400">
                {models.length === 0 ? '불러온 모델이 없습니다.' : '검색 조건과 일치하는 모델이 없습니다.'}
              </div>
            ) : (
              filteredModels.map(model => {
                const isCurrent = model.id === selectedModel;
                const isFree = model.id.includes(':free');
                const isFast =
                  FAST_RECOMMENDED_MODELS.some(p => model.id.includes(p)) ||
                  model.id.includes('flash') ||
                  model.id.includes('fast') ||
                  model.id.includes('mini');

                return (
                  <button
                    key={model.id}
                    type="button"
                    onClick={() => handleSelect(model.id)}
                    className={`w-full text-left p-3 rounded-xl border transition flex flex-col gap-1.5 group ${
                      isCurrent
                        ? 'border-dark-900 bg-dark-50/70 ring-2 ring-dark-900/10'
                        : 'border-dark-200 bg-white hover:border-dark-400 hover:bg-dark-50/40'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 flex-wrap min-w-0">
                        <span className="font-mono text-sm font-semibold text-dark-900 group-hover:text-primary transition truncate">
                          {model.id}
                        </span>
                        {isFast && (
                          <span className="inline-flex items-center gap-0.5 text-[11px] font-medium px-1.5 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200">
                            <Zap className="w-3 h-3" />
                            빠른 응답
                          </span>
                        )}
                        {isFree && (
                          <span className="text-[11px] font-medium px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200">
                            FREE
                          </span>
                        )}
                        {model.context_length && (
                          <span className="text-[11px] font-mono px-1.5 py-0.5 rounded bg-dark-100 text-dark-600">
                            {Math.round(model.context_length / 1000)}k ctx
                          </span>
                        )}
                      </div>
                      {isCurrent && (
                        <span className="shrink-0 flex items-center gap-1 text-xs font-semibold text-emerald-600">
                          <Check className="w-4 h-4" />
                          선택됨
                        </span>
                      )}
                    </div>

                    {model.name && model.name !== model.id && (
                      <div className="text-xs font-medium text-dark-700">{model.name}</div>
                    )}

                    {model.description && (
                      <div className="text-xs text-dark-500 line-clamp-2 leading-relaxed">{model.description}</div>
                    )}
                  </button>
                );
              })
            )}
          </div>
        )}
      </div>
    </AdminModal>
  );
}

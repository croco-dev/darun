import OpenAI from 'openai';
import { AsyncLocalStorage } from 'node:async_hooks';
import { getOpenRouterApiKey } from '../constant';
import type { LlmConfig, LlmConfigProvider } from './LlmConfig';
import {
  LlmEndpointKeyError,
  LlmConfigReadFailedError,
  normalizeLlmEndpointBase,
  resolveLlmEndpointKey,
} from './LlmEndpointKeyPolicy';
import { DEFAULT_LLM_ENDPOINT, DEFAULT_LLM_MODEL, type LlmModel } from './LlmModel';

export type LlmChatMessage = {
  role: 'system' | 'user' | 'assistant';
  content: string;
};

export class LlmCompletionError extends Error {
  constructor(public readonly code: 'LLM_RESPONSE_REFUSED' | 'LLM_RESPONSE_INCOMPLETE') {
    super(code === 'LLM_RESPONSE_REFUSED' ? 'LLM completion was refused' : 'LLM completion did not finish');
    this.name = 'LlmCompletionError';
  }
}

export class LlmClient {
  private readonly clientCache = new Map<string, OpenAI>();
  private readonly attemptConfig = new AsyncLocalStorage<{
    config?: Promise<LlmConfig>;
  }>();

  constructor(private readonly configProvider?: LlmConfigProvider) {}

  /** Resolve on first use inside claimed work; credentials and the snapshot stay attempt-local. */
  async withConfigSnapshot<T>(run: () => Promise<T>): Promise<T> {
    return this.attemptConfig.run({}, run);
  }

  async getConfig(): Promise<LlmConfig> {
    const attempt = this.attemptConfig.getStore();
    if (attempt) {
      attempt.config ??= this.readConfig();
      return { ...(await attempt.config) };
    }
    return this.readConfig();
  }

  private async readConfig(): Promise<LlmConfig> {
    let config: LlmConfig;
    if (this.configProvider) {
      try {
        config = await this.configProvider.getConfig();
      } catch (error) {
        if (error instanceof LlmConfigReadFailedError || error instanceof LlmEndpointKeyError) throw error;
        throw new LlmConfigReadFailedError();
      }
    } else {
      config = {
        endpoint: process.env['OPEN_ROUTER_ENDPOINT'] || DEFAULT_LLM_ENDPOINT,
        apiKey: '',
        model: process.env['OPEN_ROUTER_MODEL'] || DEFAULT_LLM_MODEL,
        thinkingLevel: process.env['OPEN_ROUTER_THINKING_LEVEL'] || null,
      };
    }
    const endpoint = normalizeLlmEndpointBase(config.endpoint || DEFAULT_LLM_ENDPOINT);
    const key = resolveLlmEndpointKey({
      endpoint,
      explicitApiKey: config.apiKey,
      envApiKey: getOpenRouterApiKey(),
    });
    if (!key.allowed) throw new LlmEndpointKeyError();
    return {
      endpoint,
      apiKey: key.apiKey ?? '',
      model: config.model || DEFAULT_LLM_MODEL,
      thinkingLevel:
        config.thinkingLevel !== undefined ? config.thinkingLevel : (process.env['OPEN_ROUTER_THINKING_LEVEL'] ?? null),
    };
  }

  private getClient(endpoint: string, apiKey: string): OpenAI {
    const key = `${endpoint}::${apiKey}`;
    let client = this.clientCache.get(key);

    if (!client) {
      if (!apiKey) {
        throw new Error('LLM API key is not provided (checked DB settings and environment variable)');
      }

      client = new OpenAI({
        baseURL: endpoint,
        apiKey,
        timeout: 120_000,
        maxRetries: 0,
      });
      this.clientCache.set(key, client);
    }

    return client;
  }

  async completion(
    modelOrMessages: LlmModel | LlmChatMessage[],
    maybeMessages?: LlmChatMessage[],
    options?: {
      thinkingLevel?: string | null;
      responseFormat?: OpenAI.Chat.Completions.ChatCompletionCreateParamsNonStreaming['response_format'];
      signal?: AbortSignal;
    }
  ): Promise<OpenAI.Chat.Completions.ChatCompletionMessage> {
    const config = await this.getConfig();

    let model: string;
    let messages: LlmChatMessage[];

    if (Array.isArray(modelOrMessages)) {
      model = config.model;
      messages = modelOrMessages;
    } else {
      model = modelOrMessages || config.model;
      messages = maybeMessages ?? [];
    }

    const client = this.getClient(config.endpoint, config.apiKey);

    const thinkingLevel = options?.thinkingLevel !== undefined ? options.thinkingLevel : config.thinkingLevel;
    const isOpenRouter = new URL(config.endpoint).hostname === 'openrouter.ai';

    const requestBody: OpenAI.Chat.Completions.ChatCompletionCreateParamsNonStreaming = {
      model,
      messages,
    };

    if (options?.responseFormat) {
      requestBody.response_format = options.responseFormat;
      if (options.responseFormat.type === 'json_schema' && isOpenRouter) {
        Object.assign(requestBody, { provider: { require_parameters: true } });
      }
    }

    if (thinkingLevel && thinkingLevel.trim() !== '') {
      const level = thinkingLevel.trim();
      if (!['none', 'minimal', 'low', 'medium', 'high', 'xhigh', 'max'].includes(level)) {
        throw new Error(
          '지원하지 않는 추론 강도입니다. none, minimal, low, medium, high, xhigh, max 중에서 선택해 주세요.'
        );
      }
      if (isOpenRouter) {
        if (level === 'low' || level === 'medium' || level === 'high') {
          requestBody.reasoning_effort = level;
        }
        Object.assign(requestBody, { reasoning: { effort: level } });
      } else {
        // The installed SDK predates none/xhigh/max; it still serializes these API-supported values.
        Object.assign(requestBody, { reasoning_effort: level });
      }
    }

    if (options?.signal?.aborted) {
      const aborted = new Error('LLM completion was aborted');
      aborted.name = 'AbortError';
      throw aborted;
    }

    const completion = options?.signal
      ? await client.chat.completions.create(requestBody, {
          signal: options.signal,
        })
      : await client.chat.completions.create(requestBody);

    const choice = completion.choices[0];
    const message = choice?.message;

    if (!message) {
      throw new Error(`LLM completion is empty for model: ${model}`);
    }

    if (message.refusal) {
      throw new LlmCompletionError('LLM_RESPONSE_REFUSED');
    }
    if (choice?.finish_reason !== 'stop') {
      throw new LlmCompletionError('LLM_RESPONSE_INCOMPLETE');
    }

    return message;
  }
}

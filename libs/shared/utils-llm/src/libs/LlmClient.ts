import OpenAI from 'openai';
import { getOpenRouterApiKey } from '../constant';
import type { LlmConfig, LlmConfigProvider } from './LlmConfig';
import { DEFAULT_LLM_ENDPOINT, DEFAULT_LLM_MODEL, type LlmModel } from './LlmModel';

export type LlmChatMessage = {
  role: 'system' | 'user' | 'assistant';
  content: string;
};

export class LlmClient {
  private readonly clientCache = new Map<string, OpenAI>();

  constructor(private readonly configProvider?: LlmConfigProvider) {}

  async getConfig(): Promise<LlmConfig> {
    const envApiKey = getOpenRouterApiKey() || '';

    if (this.configProvider) {
      try {
        const config = await this.configProvider.getConfig();
        return {
          endpoint: config.endpoint || DEFAULT_LLM_ENDPOINT,
          apiKey: config.apiKey || envApiKey,
          model: config.model || DEFAULT_LLM_MODEL,
          thinkingLevel: config.thinkingLevel ?? process.env['OPEN_ROUTER_THINKING_LEVEL'] ?? null,
        };
      } catch (error) {
        console.warn('[LlmClient] Failed to load config from provider, falling back to default configuration:', error);
      }
    }

    return {
      endpoint: process.env['OPEN_ROUTER_ENDPOINT'] || DEFAULT_LLM_ENDPOINT,
      apiKey: envApiKey,
      model: process.env['OPEN_ROUTER_MODEL'] || DEFAULT_LLM_MODEL,
      thinkingLevel: process.env['OPEN_ROUTER_THINKING_LEVEL'] || null,
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

    const requestBody: OpenAI.Chat.Completions.ChatCompletionCreateParamsNonStreaming = {
      model,
      messages,
    };

    if (options?.responseFormat) {
      requestBody.response_format = options.responseFormat;
      if (options.responseFormat.type === 'json_schema' && new URL(config.endpoint).hostname === 'openrouter.ai') {
        Object.assign(requestBody, { provider: { require_parameters: true } });
      }
    }

    if (thinkingLevel && thinkingLevel.trim() !== '') {
      const level = thinkingLevel.trim();
      if (['low', 'medium', 'high'].includes(level)) {
        requestBody.reasoning_effort = level as 'low' | 'medium' | 'high';
      }
      (requestBody as unknown as Record<string, unknown>)['reasoning'] = {
        effort: level,
      };
    }

    const completion = await client.chat.completions.create(requestBody);

    const choice = completion.choices[0];
    const message = choice?.message;

    if (!message) {
      throw new Error(`LLM completion is empty for model: ${model}`);
    }

    if (options?.responseFormat?.type === 'json_schema') {
      if (message.refusal) {
        throw new Error(`LLM structured completion was refused for model: ${model}`);
      }
      if (choice?.finish_reason !== 'stop') {
        throw new Error(`LLM structured completion did not finish for model: ${model} (${choice?.finish_reason})`);
      }
    }

    return message;
  }
}

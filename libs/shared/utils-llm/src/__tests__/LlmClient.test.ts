import { describe, it, expect, vi, beforeEach } from 'vitest';
import { LlmClient } from '../libs/LlmClient';
import type { LlmConfigProvider } from '../libs/LlmConfig';
import { DEFAULT_LLM_ENDPOINT, DEFAULT_LLM_MODEL } from '../libs/LlmModel';

const mockCreate = vi.fn();

vi.mock('openai', () => {
  return {
    default: class MockOpenAI {
      public chat = {
        completions: {
          create: mockCreate,
        },
      };
    },
  };
});

describe('LlmClient', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env['OPEN_ROUTER_API_KEY'] = 'test-env-key';
  });

  it('should fall back to env and default model when no config provider is given', async () => {
    mockCreate.mockResolvedValueOnce({
      choices: [{ message: { role: 'assistant', content: 'test response' } }],
    });

    const client = new LlmClient();
    const config = await client.getConfig();

    expect(config.endpoint).toBe(DEFAULT_LLM_ENDPOINT);
    expect(config.model).toBe(DEFAULT_LLM_MODEL);
    expect(config.apiKey).toBe('test-env-key');

    const result = await client.completion([{ role: 'user', content: 'Hello' }]);

    expect(result.content).toBe('test response');
    expect(mockCreate).toHaveBeenCalledWith({
      model: 'nvidia/nemotron-3-super-120b-a12b:free',
      messages: [{ role: 'user', content: 'Hello' }],
    });
  });

  it('should use dynamic config from provider when provided', async () => {
    mockCreate.mockReset();
    mockCreate.mockResolvedValueOnce({
      choices: [{ message: { role: 'assistant', content: 'custom response' } }],
    });

    const customProvider: LlmConfigProvider = {
      getConfig: vi.fn().mockResolvedValue({
        endpoint: 'https://custom-llm.com/v1',
        apiKey: 'custom-db-key',
        model: 'custom-model-x',
      }),
    };

    const client = new LlmClient(customProvider);
    const config = await client.getConfig();

    expect(config.endpoint).toBe('https://custom-llm.com/v1');
    expect(config.apiKey).toBe('custom-db-key');
    expect(config.model).toBe('custom-model-x');

    const result = await client.completion([{ role: 'user', content: 'Hi' }]);

    expect(result.content).toBe('custom response');
    expect(mockCreate).toHaveBeenCalledWith({
      model: 'custom-model-x',
      messages: [{ role: 'user', content: 'Hi' }],
    });
  });

  it('should respect explicitly passed model while using config endpoint and apiKey', async () => {
    mockCreate.mockReset();
    mockCreate.mockResolvedValueOnce({
      choices: [{ message: { role: 'assistant', content: 'specific model response' } }],
    });

    const client = new LlmClient();
    await client.completion('x-ai/grok-4-fast', [{ role: 'user', content: 'Translate this' }]);

    expect(mockCreate).toHaveBeenCalledWith({
      model: 'x-ai/grok-4-fast',
      messages: [{ role: 'user', content: 'Translate this' }],
    });
  });

  it('should pass reasoning / reasoning_effort when thinkingLevel is configured', async () => {
    mockCreate.mockReset();
    mockCreate.mockResolvedValueOnce({
      choices: [{ message: { role: 'assistant', content: 'thinking response' } }],
    });

    const customProvider: LlmConfigProvider = {
      getConfig: vi.fn().mockResolvedValue({
        endpoint: 'https://openrouter.ai/api/v1',
        apiKey: 'custom-db-key',
        model: 'nvidia/nemotron-3-ultra-550b-a55b:free',
        thinkingLevel: 'high',
      }),
    };

    const client = new LlmClient(customProvider);
    await client.completion([{ role: 'user', content: 'Think about this' }]);

    expect(mockCreate).toHaveBeenCalledWith({
      model: 'nvidia/nemotron-3-ultra-550b-a55b:free',
      messages: [{ role: 'user', content: 'Think about this' }],
      reasoning_effort: 'high',
      reasoning: {
        effort: 'high',
      },
    });
  });
});

const responseFormat = {
  type: 'json_schema' as const,
  json_schema: {
    name: 'test',
    strict: true,
    schema: {
      type: 'object',
      properties: {},
      required: [],
      additionalProperties: false,
    },
  },
};

describe('structured completions', () => {
  beforeEach(() => {
    mockCreate.mockReset();
    process.env['OPEN_ROUTER_API_KEY'] = 'test-key';
  });

  it.each(['https://openrouter.ai/api/v1', 'https://custom-llm.com/v1'])(
    'passes a strict schema and requires supported routing only for OpenRouter: %s',
    async endpoint => {
      mockCreate.mockResolvedValueOnce({
        choices: [{ finish_reason: 'stop', message: { content: '{}', refusal: null } }],
      });
      const client = new LlmClient({
        getConfig: vi.fn().mockResolvedValue({
          endpoint,
          apiKey: 'test-key',
          model: 'test-model',
        }),
      });
      await client.completion('test-model', [{ role: 'user', content: 'Generate' }], { responseFormat });
      expect(mockCreate).toHaveBeenCalledWith({
        model: 'test-model',
        messages: [{ role: 'user', content: 'Generate' }],
        response_format: responseFormat,
        ...(endpoint.includes('openrouter.ai') ? { provider: { require_parameters: true } } : {}),
      });
    }
  );

  it.each(['length', 'content_filter', 'tool_calls'])(
    'rejects incomplete structured output: %s',
    async finishReason => {
      mockCreate.mockResolvedValueOnce({
        choices: [
          {
            finish_reason: finishReason,
            message: { content: '{"partial":', refusal: null },
          },
        ],
      });
      await expect(new LlmClient().completion('test-model', [], { responseFormat })).rejects.toThrow('did not finish');
    }
  );

  it('rejects a refusal even when it includes content', async () => {
    mockCreate.mockResolvedValueOnce({
      choices: [
        {
          finish_reason: 'stop',
          message: { content: '{}', refusal: 'refused' },
        },
      ],
    });
    await expect(new LlmClient().completion('test-model', [], { responseFormat })).rejects.toThrow('was refused');
  });
});

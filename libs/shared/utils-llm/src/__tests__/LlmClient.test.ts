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
      model: 'nvidia/nemotron-3-ultra-550b-a55b:free',
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

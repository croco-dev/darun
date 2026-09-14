import { DEFAULT_LLM_ENDPOINT, DEFAULT_LLM_MODEL } from '@darun/utils-llm';
import { describe, expect, it } from 'vitest';
import { resolveLlmFormDefaults } from '../features/settings/LlmSettingFormSection/LlmSettingFormSection';

describe('resolveLlmFormDefaults', () => {
  it('falls back to default endpoint and model when setting is undefined', () => {
    const defaults = resolveLlmFormDefaults(undefined);

    expect(defaults.endpoint).toBe(DEFAULT_LLM_ENDPOINT);
    expect(defaults.model).toBe(DEFAULT_LLM_MODEL);
    expect(defaults.thinkingLevel).toBe('');
  });

  it('falls back to default endpoint and model when existing values are empty strings', () => {
    const defaults = resolveLlmFormDefaults({
      endpoint: '',
      model: '',
      thinkingLevel: '',
    });

    expect(defaults.endpoint).toBe(DEFAULT_LLM_ENDPOINT);
    expect(defaults.model).toBe(DEFAULT_LLM_MODEL);
    expect(defaults.thinkingLevel).toBe('');
  });

  it('preserves configured custom endpoint, model, and thinkingLevel', () => {
    const custom = {
      endpoint: 'https://custom-llm.api/v1',
      model: 'custom/model-v1',
      thinkingLevel: 'high',
    };

    const defaults = resolveLlmFormDefaults(custom);

    expect(defaults.endpoint).toBe('https://custom-llm.api/v1');
    expect(defaults.model).toBe('custom/model-v1');
    expect(defaults.thinkingLevel).toBe('high');
  });
});

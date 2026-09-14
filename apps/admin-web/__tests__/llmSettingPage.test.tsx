import { AdminLoadingState } from '@darun/ui-admin';
import React from 'react';
import { describe, expect, it } from 'vitest';
import LlmSettingPage from '../app/settings/llm/page';

describe('LlmSettingPage', () => {
  it('is a Server Component returning PageShell with Suspense fallback', () => {
    const element = LlmSettingPage();

    expect(React.isValidElement(element)).toBe(true);
    expect(element.props.title).toBe('LLM 설정');

    const children = element.props.children;
    expect(React.isValidElement(children)).toBe(true);
    expect(children.type).toBe(React.Suspense);
    expect(React.isValidElement(children.props.fallback)).toBe(true);
    expect(children.props.fallback.type).toBe(AdminLoadingState);
  });
});

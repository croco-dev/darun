// @vitest-environment jsdom

import React, { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { bind } from './index';

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });

let root: Root | undefined;

afterEach(() => {
  if (root) {
    act(() => root?.unmount());
    root = undefined;
  }
  document.body.replaceChildren();
});

describe('bind', () => {
  it('combines useHook and View Component and forwards props', () => {
    const useHook = (props: { prefix: string }) => {
      return { message: `${props.prefix} world` };
    };

    const View = vi.fn(({ message }: { message: string }) => {
      return <div>{message}</div>;
    });

    const Bound = bind(useHook, View);

    const container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);

    act(() => {
      root?.render(<Bound prefix="hello" />);
    });

    expect(View).toHaveBeenCalled();
    expect(View.mock.calls[0][0]).toEqual({ message: 'hello world' });
    expect(container.textContent).toBe('hello world');
  });

  it('sets displayName when options.displayName is provided', () => {
    const useHook = () => ({});
    const View = () => <div />;

    const Bound = bind(useHook, View, { displayName: 'MyComponent' });

    expect(Bound.displayName).toBe('MyComponent');
    expect(Bound.ViewComponent.displayName).toBe('MyComponentView');
  });
});

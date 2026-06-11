// @vitest-environment jsdom

import React, { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ProductUserAction } from './ProductUserAction';

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });

const mockAddToast = vi.fn();

vi.mock('@darun/ui', async importOriginal => {
  const original = await importOriginal<typeof import('@darun/ui')>();
  return {
    ...original,
    useToast: () => ({
      addToast: mockAddToast,
      toasts: [],
      removeToast: vi.fn(),
    }),
  };
});

vi.mock('../CompareButton', () => ({
  CompareButton: () => <div data-testid="mock-compare-button">Compare</div>,
}));

describe('ProductUserAction Toast Integration', () => {
  let root: Root | undefined;
  let container: HTMLDivElement;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
    mockAddToast.mockClear();
  });

  afterEach(() => {
    if (root) {
      act(() => root?.unmount());
      root = undefined;
    }
    document.body.replaceChildren();
    vi.clearAllMocks();
  });

  it('calls addToast with error when error state is present', () => {
    act(() => {
      root?.render(
        <ProductUserAction.ViewComponent
          voteCount={10}
          upvoteProduct={vi.fn()}
          voted={false}
          loading={false}
          error="투표에 실패했습니다. 다시 시도해주세요."
          slug="test-product"
        />
      );
    });

    expect(mockAddToast).toHaveBeenCalledWith('투표에 실패했습니다. 다시 시도해주세요.', 'error');
  });

  it('calls addToast with success when voted and not loading', () => {
    act(() => {
      root?.render(
        <ProductUserAction.ViewComponent
          voteCount={11}
          upvoteProduct={vi.fn()}
          voted={true}
          loading={false}
          error={null}
          slug="test-product"
        />
      );
    });

    expect(mockAddToast).toHaveBeenCalledWith('투표가 완료되었습니다!', 'success');
  });
});

describe('ToastProvider Accessibility', () => {
  let root: Root | undefined;
  let container: HTMLDivElement;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(() => {
    if (root) {
      act(() => root?.unmount());
      root = undefined;
    }
    document.body.replaceChildren();
  });

  it('renders success toast with role="status" and aria-live="polite"', async () => {
    const { ToastProvider: RealTP, useToast: realUseToast } =
      await vi.importActual<typeof import('@darun/ui')>('@darun/ui');

    function Trigger() {
      const { addToast } = realUseToast();
      React.useEffect(() => {
        addToast('성공했습니다!', 'success');
      }, [addToast]);
      return null;
    }

    act(() => {
      root?.render(
        <RealTP>
          <Trigger />
        </RealTP>
      );
    });

    const toast = container.querySelector('[data-testid="toast-success"]');
    expect(toast).not.toBeNull();
    expect(toast?.getAttribute('role')).toBe('status');
    expect(toast?.getAttribute('aria-live')).toBe('polite');
    expect(toast?.textContent).toBe('성공했습니다!');
  });

  it('renders error toast with role="alert" and aria-live="assertive"', async () => {
    const { ToastProvider: RealTP, useToast: realUseToast } =
      await vi.importActual<typeof import('@darun/ui')>('@darun/ui');

    function Trigger() {
      const { addToast } = realUseToast();
      React.useEffect(() => {
        addToast('오류가 발생했습니다', 'error');
      }, [addToast]);
      return null;
    }

    act(() => {
      root?.render(
        <RealTP>
          <Trigger />
        </RealTP>
      );
    });

    const toast = container.querySelector('[data-testid="toast-error"]');
    expect(toast).not.toBeNull();
    expect(toast?.getAttribute('role')).toBe('alert');
    expect(toast?.getAttribute('aria-live')).toBe('assertive');
    expect(toast?.textContent).toBe('오류가 발생했습니다');
  });
});

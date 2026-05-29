import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { useProductTableOfContent } from '../components/ProductTableOfContent/useProductTableOfContent';

class MockIntersectionObserver implements IntersectionObserver {
  readonly root: Element | Document | null = null;
  readonly rootMargin: string = '';
  readonly scrollMargin: string = '';
  readonly thresholds: readonly number[] = [];

  static observers = new Set<MockIntersectionObserver>();
  callback: IntersectionObserverCallback;
  elements = new Set<Element>();

  constructor(callback: IntersectionObserverCallback) {
    this.callback = callback;
    MockIntersectionObserver.observers.add(this);
  }

  observe(target: Element): void {
    this.elements.add(target);
  }

  unobserve(target: Element): void {
    this.elements.delete(target);
  }

  disconnect(): void {
    this.elements.clear();
    MockIntersectionObserver.observers.delete(this);
  }

  takeRecords(): IntersectionObserverEntry[] {
    return [];
  }

  trigger(entries: Partial<IntersectionObserverEntry>[]) {
    const fullEntries = entries.map(entry => ({
      boundingClientRect: { top: 0, bottom: 0, left: 0, right: 0, width: 0, height: 0, x: 0, y: 0, toJSON: () => {} },
      intersectionRatio: 0,
      intersectionRect: { top: 0, bottom: 0, left: 0, right: 0, width: 0, height: 0, x: 0, y: 0, toJSON: () => {} },
      isIntersecting: false,
      rootBounds: null,
      target: document.createElement('div'),
      time: Date.now(),
      ...entry,
    })) as IntersectionObserverEntry[];

    this.callback(fullEntries, this as unknown as IntersectionObserver);
  }
}

global.IntersectionObserver = MockIntersectionObserver as unknown as typeof IntersectionObserver;

describe('useProductTableOfContent', () => {
  let container: HTMLDivElement;

  beforeEach(() => {
    container = document.createElement('div');
    container.id = 'detail-content';
    document.body.appendChild(container);
    MockIntersectionObserver.observers.clear();
  });

  afterEach(() => {
    document.body.removeChild(container);
  });

  it('should detect headings inside detail-content', () => {
    const h1 = document.createElement('div');
    h1.id = 'heading-1';
    h1.className = 'darun-heading';
    h1.textContent = 'Heading 1';
    container.appendChild(h1);

    const h2 = document.createElement('div');
    h2.id = 'heading-2';
    h2.className = 'darun-heading';
    h2.textContent = 'Heading 2';
    container.appendChild(h2);

    const { result } = renderHook(() => useProductTableOfContent());

    expect(result.current.headings).toEqual([
      { id: 'heading-1', text: 'Heading 1' },
      { id: 'heading-2', text: 'Heading 2' },
    ]);
  });

  it('should update active heading based on IntersectionObserver events', () => {
    const h1 = document.createElement('div');
    h1.id = 'heading-1';
    h1.className = 'darun-heading';
    h1.textContent = 'Heading 1';
    container.appendChild(h1);

    const h2 = document.createElement('div');
    h2.id = 'heading-2';
    h2.className = 'darun-heading';
    h2.textContent = 'Heading 2';
    container.appendChild(h2);

    const { result } = renderHook(() => useProductTableOfContent());

    expect(result.current.activeHeadingId).toBe('heading-1');

    const observer = Array.from(MockIntersectionObserver.observers)[0];
    expect(observer).toBeDefined();

    act(() => {
      observer.trigger([
        {
          target: h1,
          isIntersecting: false,
          boundingClientRect: { top: 30 } as unknown as DOMRectReadOnly,
        },
      ]);
    });

    expect(result.current.activeHeadingId).toBe('heading-1');

    act(() => {
      observer.trigger([
        {
          target: h2,
          isIntersecting: false,
          boundingClientRect: { top: 20 } as unknown as DOMRectReadOnly,
        },
      ]);
    });

    expect(result.current.activeHeadingId).toBe('heading-2');

    act(() => {
      observer.trigger([
        {
          target: h2,
          isIntersecting: true,
          boundingClientRect: { top: 100 } as unknown as DOMRectReadOnly,
        },
      ]);
    });

    expect(result.current.activeHeadingId).toBe('heading-1');
  });

  it('should handle dynamic DOM changes with MutationObserver', async () => {
    const { result } = renderHook(() => useProductTableOfContent());

    expect(result.current.headings).toEqual([]);

    const h1 = document.createElement('div');
    h1.id = 'heading-1';
    h1.className = 'darun-heading';
    h1.textContent = 'Heading 1';

    act(() => {
      container.appendChild(h1);
    });

    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 0));
    });

    expect(result.current.headings).toEqual([{ id: 'heading-1', text: 'Heading 1' }]);
  });
});

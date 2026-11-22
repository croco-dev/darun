// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { FlowDetail } from '../features/flows/FlowDetail';
import type { FlowDetailData } from '../features/flows/useFlowDetail';

vi.mock('@darun/utils-router', async importOriginal => ({
  ...(await importOriginal<typeof import('@darun/utils-router')>()),
  useSearchParams: () => new URLSearchParams(window.location.search),
}));
vi.mock('../features/collections/SaveButton', () => ({ SaveButton: () => null }));
vi.mock('../features/saves/VisualSaveButton', () => ({ VisualSaveButton: () => null }));

const detail: FlowDetailData = {
  id: 'search-flow',
  title: '상품 검색하기',
  description: '',
  platform: 'WEB',
  flowType: 'SEARCH',
  stepCount: 2,
  steps: ['검색', '결과'].map((title, position) => ({
    position,
    caption: '',
    screenshot: { id: title, imageUrl: `/step-${position}.png`, imageAlt: `${title} 화면`, title },
  })),
  product: { id: 'memo', name: '메모', slug: 'memo', summary: null, logoUrl: '' },
  relatedFlows: [],
  relatedFlowTotalCount: 0,
};

beforeEach(() => {
  Object.defineProperty(HTMLElement.prototype, 'scrollTo', { configurable: true, value: vi.fn() });
  // Keep the real Dialog effects and events. jsdom lacks native modal behavior.
  Object.defineProperties(HTMLDialogElement.prototype, {
    showModal: {
      configurable: true,
      value(this: HTMLDialogElement) {
        this.open = true;
      },
    },
    close: {
      configurable: true,
      value(this: HTMLDialogElement) {
        this.open = false;
        this.dispatchEvent(new Event('close'));
      },
    },
  });
});

afterEach(() => {
  cleanup();
  window.history.replaceState(null, '', '/');
  Reflect.deleteProperty(HTMLDialogElement.prototype, 'showModal');
  Reflect.deleteProperty(HTMLDialogElement.prototype, 'close');
  Reflect.deleteProperty(HTMLElement.prototype, 'scrollTo');
});

function openZoom() {
  const view = () => (
    <FlowDetail.ViewComponent
      status="loaded"
      detail={detail}
      retry={() => {}}
      relatedStatus="loaded"
      retryRelated={() => {}}
    />
  );
  const { rerender } = render(view());
  const preview = screen.getByRole('region', { name: '플로 단계 이미지' });
  fireEvent.load(within(preview).getByRole('img', { name: '검색 화면' }));
  const opener = within(preview).getByRole('button', { name: '확대' });
  opener.focus();
  fireEvent.click(opener);
  const dialog = screen.getByRole('dialog');
  return {
    preview,
    opener,
    dialog,
    nextStep() {
      fireEvent.click(within(dialog).getByRole('button', { name: '다음 단계' }));
      // Next's patched history updates useSearchParams in the browser.
      rerender(view());
      expect(within(dialog).getByRole('heading').textContent).toContain('2 / 2');
      expect(opener.isConnected).toBe(false);
    },
  };
}

it('같은 단계에서 확대를 닫으면 열었던 버튼에 초점을 돌려준다', () => {
  const { opener, dialog } = openZoom();
  fireEvent.click(within(dialog).getByRole('button', { name: '닫기' }));
  expect(document.activeElement).toBe(opener);
});

it('다른 단계로 이동한 뒤 확대를 닫으면 현재 단계 확대 버튼에 초점을 둔다', () => {
  const { preview, dialog, nextStep } = openZoom();
  nextStep();
  fireEvent.load(within(preview).getByRole('img', { name: '결과 화면' }));
  const currentZoom = within(preview).getByRole('button', { name: '확대' });
  fireEvent.click(within(dialog).getByRole('button', { name: '닫기' }));
  expect(document.activeElement).toBe(currentZoom);
});

it.each(['loading', 'error'])('현재 이미지가 %s 상태이면 Escape로 닫을 때 단계 이미지로 돌아간다', status => {
  const { preview, dialog, nextStep } = openZoom();
  nextStep();
  const image = within(preview).getByRole('img', { name: '결과 화면' });
  if (status === 'error') fireEvent.error(image);
  expect(within(preview).queryByRole('button', { name: '확대' })).toBeNull();
  fireEvent(dialog, new Event('cancel', { cancelable: true }));
  expect(dialog.hasAttribute('open')).toBe(false);
  expect(document.activeElement).toBe(preview);
});

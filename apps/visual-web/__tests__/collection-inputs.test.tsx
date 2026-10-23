// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { Collections } from '../features/collections/Collections';
import { savedIn, type NamedCollection } from '../features/collections/collectionStore';
import { SaveButton } from '../features/collections/SaveButton';

const KEY = 'darun-visual-collections-v1';
const item = {
  kind: 'flow' as const,
  id: 'checkout-42',
  title: '결제 확인',
  imageUrl: '/synthetic-checkout.png',
  href: '/flows/checkout-42',
  productName: '합성 상점',
};

function persisted(): NamedCollection[] {
  return JSON.parse(localStorage.getItem(KEY) ?? '[]');
}

beforeEach(() => {
  localStorage.clear();
  window.dispatchEvent(new StorageEvent('storage', { key: KEY }));
  // jsdom does not implement the native dialog methods. Keep the real Dialog's
  // effects, children, keyboard listeners and focus restoration in the fixture.
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
  Reflect.deleteProperty(HTMLDialogElement.prototype, 'showModal');
  Reflect.deleteProperty(HTMLDialogElement.prototype, 'close');
  vi.restoreAllMocks();
});

for (const surface of ['Collections', 'SaveButton'] as const) {
  describe(`${surface} 이름 입력`, () => {
    function openInput(): HTMLInputElement {
      render(surface === 'Collections' ? <Collections /> : <SaveButton item={item} />);
      if (surface === 'SaveButton') fireEvent.click(screen.getByRole('button', { name: '컬렉션에 저장' }));
      return screen.getByRole('textbox', { name: '새 컬렉션 이름' });
    }

    function expectCreated(name: string) {
      const collections = persisted();
      expect(collections).toHaveLength(1);
      expect(collections[0]).toMatchObject({ name, items: surface === 'SaveButton' ? [item] : [] });
      expect(savedIn('flow', 'checkout-42').map(collection => collection.name)).toEqual(
        surface === 'SaveButton' ? [name] : []
      );
      expect(savedIn('screenshot', 'checkout-42')).toEqual([]);
    }

    it.each([
      { boundary: 'isComposing', isComposing: true, keyCode: 13 },
      { boundary: 'keyCode 229', isComposing: false, keyCode: 229 },
    ])('$boundary 조합 확정 Enter는 draft와 저장소를 보존하고 별도 Enter만 생성한다', boundary => {
      const input = openInput();
      const writes = vi.spyOn(Storage.prototype, 'setItem');
      fireEvent.compositionStart(input);
      fireEvent.change(input, { target: { value: '  결제 참고  ' } });
      fireEvent.keyDown(input, { key: 'Enter', ...boundary });
      expect(input.value).toBe('  결제 참고  ');
      expect(writes).not.toHaveBeenCalled();
      expect(localStorage.getItem(KEY)).toBeNull();
      expect(persisted()).toEqual([]);
      expect(savedIn('flow', 'checkout-42')).toEqual([]);
      expect(screen.queryByRole('heading', { level: 2 })).toBeNull();
      expect(screen.queryByRole('checkbox')).toBeNull();

      fireEvent.compositionEnd(input, { data: '고' });
      expect(input.value).toBe('  결제 참고  ');
      expect(writes).not.toHaveBeenCalled();
      fireEvent.keyDown(input, { key: 'Enter', keyCode: 13, isComposing: false });
      expectCreated('결제 참고');
      expect(input.value).toBe('');
      expect(writes).toHaveBeenCalledTimes(surface === 'SaveButton' ? 2 : 1);
      fireEvent.keyDown(input, { key: 'Enter', keyCode: 13 });
      expectCreated('결제 참고');
      expect(writes).toHaveBeenCalledTimes(surface === 'SaveButton' ? 2 : 1);
    });

    it.each(['Enter', 'button'] as const)('%s는 일반 입력을 한 번 생성하고 빈 입력은 무시한다', submit => {
      const input = openInput();
      const button = screen.getByRole('button', { name: surface === 'Collections' ? '컬렉션 만들기' : '만들기' });
      const writes = vi.spyOn(Storage.prototype, 'setItem');
      fireEvent.change(input, { target: { value: '   ' } });
      fireEvent.keyDown(input, { key: 'Enter', keyCode: 13 });
      expect(button).toHaveProperty('disabled', true);
      fireEvent.click(button);
      expect(writes).not.toHaveBeenCalled();
      expect(input.maxLength).toBe(60);
      fireEvent.change(input, { target: { value: '  일반 참고  ' } });
      if (submit === 'Enter') fireEvent.keyDown(input, { key: 'Enter', keyCode: 13 });
      else fireEvent.click(button);
      expectCreated('일반 참고');
      expect(input.value).toBe('');
      expect(writes).toHaveBeenCalledTimes(surface === 'SaveButton' ? 2 : 1);
    });

    it('저장 실패를 표시하고 입력을 지우지 않는다', () => {
      const input = openInput();
      vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
        throw new Error('synthetic quota');
      });
      fireEvent.change(input, { target: { value: '다시 저장' } });
      fireEvent.keyDown(input, { key: 'Enter', keyCode: 13 });
      expect(screen.getByRole('alert').textContent).toContain('저장하지 못했습니다');
      expect(input.value).toBe('다시 저장');
      expect(persisted()).toEqual([]);
    });
  });
}

it('저장 dialog는 이름 입력에 포커스하고 닫기 후 trigger로 돌려준다', () => {
  render(<SaveButton item={item} />);
  const trigger = screen.getByRole('button', { name: '컬렉션에 저장' });
  trigger.focus();
  fireEvent.click(trigger);
  expect(document.activeElement).toBe(screen.getByRole('textbox', { name: '새 컬렉션 이름' }));
  fireEvent.click(screen.getByRole('button', { name: '닫기 (Esc)' }));
  expect(document.querySelector('dialog')?.open).toBe(false);
  expect(document.activeElement).toBe(trigger);
});

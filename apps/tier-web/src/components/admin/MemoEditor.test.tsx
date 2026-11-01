// @vitest-environment jsdom
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MemoEditor } from './MemoEditor';

const { updateAppMemo, toast } = vi.hoisted(() => ({
  updateAppMemo: vi.fn(),
  toast: vi.fn(),
}));
vi.mock('@/app/admin/actions', () => ({ updateAppMemo }));
vi.mock('@/hooks/use-toast', () => ({ useToast: () => ({ toast }) }));

let container: HTMLDivElement;
let root: Root;

beforeEach(() => {
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true);
  vi.resetAllMocks();
  container = document.createElement('div');
  document.body.append(container);
  root = createRoot(container);
});

afterEach(async () => {
  await act(async () => root.unmount());
  container.remove();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

async function render(content: string) {
  await act(async () => root.render(<MemoEditor appId="memo-app" initialContent={content} />));
}

async function edit(value: string) {
  await act(async () => {
    const input = container.querySelector('textarea')!;
    Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value')!.set!.call(input, value);
    input.dispatchEvent(new Event('input', { bubbles: true }));
  });
}

const input = () => container.querySelector('textarea')!;
const save = () => container.querySelector('button')!;

describe('메모의 서버 기준값과 초안', () => {
  it('미편집 상태의 새 서버 메모를 표시하고 이전 내용을 저장하지 않는다', async () => {
    await render('Old server memo');
    await render('New server memo');

    expect(input().value).toBe('New server memo');
    expect(save().disabled).toBe(true);
    await act(async () => save().click());
    expect(updateAppMemo).not.toHaveBeenCalled();
  });

  it('편집 중 서버 변경은 초안을 보존하고 알리며 자동 저장하지 않는다', async () => {
    await render('Original memo');
    await edit('My unfinished draft');
    await render('Other editor memo');

    expect(input().value).toBe('My unfinished draft');
    expect(container.querySelector('[role="status"]')?.textContent).toContain('변경');
    expect(save().disabled).toBe(false);
    expect(updateAppMemo).not.toHaveBeenCalled();

    await edit('Other editor memo');
    expect(save().disabled).toBe(true);
    expect(container.querySelector('[role="status"]')).toBeNull();
    await edit('New draft after accepting the server memo');
    expect(container.querySelector('[role="status"]')).toBeNull();
    await edit('Other editor memo');
    await render('Third server memo');
    expect(input().value).toBe('Third server memo');
  });

  it.each([
    { draft: '  Trimmed memo\n ', saved: 'Trimmed memo' },
    { draft: ' \n ', saved: '' },
  ])('성공 응답으로 표시와 기준을 맞추고 오래된 props로 되돌리지 않는다: $saved', async ({ draft, saved }) => {
    updateAppMemo.mockResolvedValueOnce(saved);
    await render('Original memo');
    await edit(draft);
    await act(async () => save().click());

    expect(updateAppMemo).toHaveBeenCalledExactlyOnceWith('memo-app', draft);
    expect(input().value).toBe(saved);
    expect(save().disabled).toBe(true);
    await render('Original memo');
    expect(input().value).toBe(saved);
    await render(saved);
    expect(input().value).toBe(saved);
    expect(save().disabled).toBe(true);
    expect(container.querySelector('[role="status"]')).toBeNull();
  });

  it('저장 중 재조회가 와도 중복 입력을 막고 성공한 값으로 기준을 확정한다', async () => {
    const request = Promise.withResolvers<string>();
    updateAppMemo.mockReturnValueOnce(request.promise);
    await render('Original memo');
    await edit('  My saved memo  ');
    await act(async () => save().click());
    await render('My saved memo');

    expect(input().disabled).toBe(true);
    expect(save().disabled).toBe(true);
    await act(async () => request.resolve('My saved memo'));
    expect(input().value).toBe('My saved memo');
    expect(input().disabled).toBe(false);
    expect(save().disabled).toBe(true);
    expect(container.querySelector('[role="status"]')).toBeNull();
  });

  it('저장 실패는 초안과 변경 경고를 보존하고 같은 내용으로 재시도한다', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    updateAppMemo.mockRejectedValueOnce(new Error('Fixture save failure')).mockResolvedValueOnce('My draft');
    await render('Original memo');
    await edit('My draft');
    await render('Other editor memo');
    await act(async () => save().click());

    expect(input().value).toBe('My draft');
    expect(save().disabled).toBe(false);
    expect(container.querySelector('[role="status"]')).not.toBeNull();
    expect(toast).toHaveBeenCalledWith(expect.objectContaining({ variant: 'destructive' }));
    await act(async () => save().click());
    expect(updateAppMemo.mock.calls).toEqual([
      ['memo-app', 'My draft'],
      ['memo-app', 'My draft'],
    ]);
    expect(input().value).toBe('My draft');
    expect(save().disabled).toBe(true);
    expect(container.querySelector('[role="status"]')).toBeNull();
  });
});

// @vitest-environment jsdom
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import SignInPage from './signin/page';
import SignUpPage from './signup/page';

const { login, signup } = vi.hoisted(() => ({ login: vi.fn(), signup: vi.fn() }));
vi.mock('@/app/login/actions', () => ({ login, signup }));

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
  vi.unstubAllGlobals();
});

function input(name: string) {
  return container.querySelector<HTMLInputElement>(`input[name="${name}"]`)!;
}

async function fill(name: string, value: string) {
  await act(async () => {
    const field = input(name);
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!.call(field, value);
    field.dispatchEvent(new Event('input', { bubbles: true }));
  });
}

async function submit() {
  await act(async () => container.querySelector('form')!.requestSubmit());
}

describe.each([
  { name: '로그인', Page: SignInPage, action: login },
  { name: '회원가입', Page: SignUpPage, action: signup },
])('$name 이메일 보존', ({ Page, action }) => {
  it('실제 폼의 실패·초기화 뒤 이메일과 오류를 유지하고 같은 이메일로 재시도한다', async () => {
    action.mockResolvedValue({ error: '인증 요청 실패' });
    await act(async () => root.render(<Page />));
    await fill('email', 'reader@example.invalid');
    await fill('password', 'fixture-password');
    await submit();

    expect(container.querySelector('[role="alert"]')?.textContent).toBe('인증 요청 실패');
    expect(input('email').value).toBe('reader@example.invalid');
    expect(input('password').value).toBe('');
    expect(container.querySelector('button')!.disabled).toBe(false);

    await fill('password', 'corrected-password');
    await submit();
    expect(action).toHaveBeenCalledTimes(2);
    expect(action.mock.calls[1][1].get('email')).toBe('reader@example.invalid');
    expect(action.mock.calls[1][1].get('password')).toBe('corrected-password');
  });

  it('대기 중 편집한 이메일을 이전 실패 응답이 지우거나 되돌리지 않는다', async () => {
    let finish!: (_result: { error: string }) => void;
    action.mockReturnValue(new Promise(resolve => (finish = resolve)));
    await act(async () => root.render(<Page />));
    await fill('email', 'submitted@example.invalid');
    await fill('password', 'fixture-password');
    await submit();
    expect(container.querySelector('button')!.disabled).toBe(true);
    expect(action.mock.calls[0][1].get('email')).toBe('submitted@example.invalid');
    await fill('email', 'edited@example.invalid');
    await act(async () => finish({ error: '지연된 인증 실패' }));
    expect(input('email').value).toBe('edited@example.invalid');
    expect(input('password').value).toBe('');
    expect(container.querySelector('[role="alert"]')?.textContent).toBe('지연된 인증 실패');
  });
});

it('가입 성공·기존 가입자 중립 안내와 비밀번호 초기화를 유지한다', async () => {
  const message = '가입 요청을 접수했습니다. 인증 이메일을 확인해 주세요. 이미 가입했다면 로그인해 주세요.';
  signup.mockResolvedValue({ message });
  await act(async () => root.render(<SignUpPage />));
  await fill('email', 'registered@example.invalid');
  await fill('password', 'fixture-password');
  await submit();
  expect(container.querySelector('[role="status"]')?.textContent).toBe(message);
  expect(container.querySelector('[role="alert"]')).toBeNull();
  expect(input('password').value).toBe('');
});

import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { mutate } = vi.hoisted(() => ({ mutate: vi.fn() }));
vi.mock('@apollo/client/react', () => ({
  useMutation: () => [mutate, { loading: false }],
  useApolloClient: () => ({ getObservableQueries: () => [] }),
}));
vi.mock('@darun/utils-router', () => ({ useNavigate: () => vi.fn() }));
vi.mock('@mantine/notifications', () => ({ notifications: { show: vi.fn() } }));
vi.mock('@darun/ui-admin', () => ({ notifySavedWithRefresh: vi.fn() }));

import { useEditProductLinkItem } from '../EditProductLinkItem/useEditProductLinkItem';
import { useNewProductLinkForm } from '../NewProductLinkForm/useNewProductLinkForm';
import { getProductLinkIconSource } from '../productLinkPresentation';

const values = {
  title: '공식 사이트',
  link: 'https://example.com',
  displayLink: 'example.com',
  iconUrl: 'icon.svg',
};

function useForms() {
  return {
    create: useNewProductLinkForm({
      productSlug: 'test',
      children: () => null,
    }),
    edit: useEditProductLinkItem({
      slug: 'test',
      link: { ...values, id: 'link-1', isPrimary: true, role: null },
    }),
  };
}

describe('실제 Mantine 상품 링크 폼 검증', () => {
  beforeEach(() => mutate.mockReset());

  it.each(['http://', 'https://', 'ftp://example.com', '/relative'])(
    '신규·수정 폼은 %s를 필드 오류로 표시하고 mutation을 보내지 않는다',
    async link => {
      const { result } = renderHook(useForms);
      act(() => {
        result.current.create.form.setValues({ ...values, link });
        result.current.edit.form.setValues({ ...values, link });
      });
      for (const kind of ['create', 'edit'] as const) {
        await act(async () => result.current[kind].form.onSubmit(result.current[kind].submit)());
        expect(result.current[kind].form.errors.link).toBeTruthy();
        expect(result.current[kind].form.getValues().link).toBe(link);
        // A caller that invokes submit directly must obey the same rule.
        await act(async () => result.current[kind].submit({ ...values, link }));
      }
      expect(mutate).not.toHaveBeenCalled();
    }
  );

  it('정상 주소의 인코딩·중복 query·fragment를 바꾸지 않고 전송한다', async () => {
    const link = 'http://example.com/a%2Fb?query=%ED%95%9C%EA%B8%80&x=1&x=2#끝';
    const { result } = renderHook(useForms);
    act(() => {
      result.current.create.form.setValues({ ...values, link });
      result.current.edit.form.setValues({ ...values, link });
    });
    for (const kind of ['create', 'edit'] as const) {
      await act(async () => result.current[kind].form.onSubmit(result.current[kind].submit)());
    }
    expect(mutate).toHaveBeenCalledTimes(2);
    for (const [request] of mutate.mock.calls) expect(request.variables.input.link).toBe(link);
  });

  it('사용자 지정 이름을 비워도 역할, 주소, 아이콘으로 새 링크를 등록한다', async () => {
    const { result } = renderHook(useForms);
    act(() => result.current.create.form.setValues({ ...values, title: '', role: 'download' }));
    await act(async () => result.current.create.form.onSubmit(result.current.create.submit)());

    expect(mutate).toHaveBeenCalledExactlyOnceWith({
      variables: {
        slug: 'test',
        input: { ...values, title: '', role: 'download' },
      },
    });
  });
});

describe('상품 링크 아이콘 주소', () => {
  it.each(['https://linear.example/logo.png', 'http://linear.example/legacy.png', '/images/link.svg?size=16'])(
    '저장한 아이콘 주소 %s를 그대로 표시한다',
    value => expect(getProductLinkIconSource(value)).toBe(value)
  );

  it.each([
    '//elsewhere.example/icon.svg',
    'https://fixture:fixture@elsewhere.example/icon.svg',
    'data:image/svg+xml,<svg/>',
    '/images/../api/icon',
  ])('지원하지 않는 주소 %s는 브라우저에 전달하지 않는다', value => expect(getProductLinkIconSource(value)).toBeNull());
});

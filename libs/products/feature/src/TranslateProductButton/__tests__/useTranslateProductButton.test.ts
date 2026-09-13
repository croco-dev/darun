import { useMutation } from '@apollo/client/react';
import { notifications } from '@mantine/notifications';
import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@apollo/client/react', async importOriginal => {
  const actual = await importOriginal();
  return {
    ...(actual as Record<string, unknown>),
    useMutation: vi.fn(),
  };
});

vi.mock('@mantine/notifications', () => ({
  notifications: {
    show: vi.fn(),
    hide: vi.fn(),
  },
}));

import { useTranslateProductButton } from '../useTranslateProductButton';

describe('useTranslateProductButton', () => {
  const defaultSlug = 'test-product';
  let mutateFn: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.clearAllMocks();
    mutateFn = vi.fn();
    vi.mocked(useMutation).mockReturnValue([mutateFn, { loading: false }] as unknown as ReturnType<typeof useMutation>);
  });

  it('calls requestProductTranslation mutation with slug', async () => {
    const { result } = renderHook(() => useTranslateProductButton({ slug: defaultSlug }));

    mutateFn.mockResolvedValueOnce({
      data: {
        requestProductTranslation: {
          entityId: 'prod-1',
          status: 'completed',
          message: '번역 완료',
        },
      },
    });

    await act(async () => {
      await result.current.translateProduct();
    });

    expect(mutateFn).toHaveBeenCalledWith({
      variables: {
        slug: defaultSlug,
      },
    });
    expect(notifications.show).toHaveBeenCalledWith(
      expect.objectContaining({
        title: '번역 진행 중',
      })
    );
  });

  it('handles mutation error gracefully', async () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const { result } = renderHook(() => useTranslateProductButton({ slug: defaultSlug }));

    mutateFn.mockRejectedValueOnce(new Error('Translation failed'));

    await act(async () => {
      await result.current.translateProduct();
    });

    expect(notifications.hide).toHaveBeenCalledWith(`translating-${defaultSlug}`);
    expect(consoleSpy).toHaveBeenCalledWith('Translation mutation failed:', expect.any(Error));
    consoleSpy.mockRestore();
  });
});

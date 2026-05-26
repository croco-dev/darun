import { useMutation } from '@apollo/client/react';
import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';

// ── Mock: @apollo/client ──────────────────────────────────────────
vi.mock('@apollo/client/react', async importOriginal => {
  const actual = await importOriginal();
  return {
    ...(actual as Record<string, unknown>),
    useMutation: vi.fn(),
  };
});

// ── Mock: @mantine/form ──────────────────────────────────────────
const mockForm = {
  reset: vi.fn(),
  getInputProps: vi.fn(() => ({ key: 'test-form-key', defaultValue: '' })),
  onSubmit: vi.fn((handler: (values: Record<string, string>) => Promise<void>) => handler),
};

vi.mock('@mantine/form', () => ({
  useForm: vi.fn(() => mockForm),
}));

// ── Mock: @mantine/notifications ─────────────────────────────────
vi.mock('@mantine/notifications', () => ({
  notifications: { show: vi.fn() },
}));

// ── Import after mocks ───────────────────────────────────────────
import { useEditProductLinkItem } from '../useEditProductLinkItem';

describe('useEditProductLinkItem', () => {
  const defaultProps = {
    slug: 'test-product',
    link: {
      id: 'link-1',
      title: 'Test Link',
      link: 'https://example.com',
      displayLink: 'Example',
      iconUrl: 'https://example.com/icon.png',
      __typename: 'Link' as const,
    },
  };
  let mutateFn: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.clearAllMocks();
    mutateFn = vi.fn();

    vi.mocked(useMutation).mockReturnValue([mutateFn, { loading: false }] as unknown as ReturnType<typeof useMutation>);
  });

  it('should log error and rethrow when update mutation fails', async () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const { result } = renderHook(() => useEditProductLinkItem(defaultProps));

    mutateFn.mockRejectedValueOnce(new Error('Network error'));

    await expect(
      act(async () => {
        await result.current.submit({
          title: 'Updated',
          link: 'https://example.com',
          displayLink: 'Example',
          iconUrl: 'https://example.com/icon.png',
        });
      })
    ).rejects.toThrow('Network error');

    expect(consoleSpy).toHaveBeenCalledWith('mutation failed:', expect.any(Error));
    consoleSpy.mockRestore();
  });

  it('should call mutation with the correct variables on success', async () => {
    const { result } = renderHook(() => useEditProductLinkItem(defaultProps));

    mutateFn.mockResolvedValueOnce({ data: { updateProductLink: { product: { id: 'product-1' } } } });

    await act(async () => {
      await result.current.submit({
        title: 'Updated Title',
        link: 'https://updated.com',
        displayLink: 'Updated',
        iconUrl: 'https://updated.com/icon.png',
      });
    });

    expect(mutateFn).toHaveBeenCalledWith({
      variables: {
        slug: defaultProps.slug,
        id: defaultProps.link.id,
        input: {
          title: 'Updated Title',
          link: 'https://updated.com',
          displayLink: 'Updated',
          iconUrl: 'https://updated.com/icon.png',
        },
      },
    });
  });
});

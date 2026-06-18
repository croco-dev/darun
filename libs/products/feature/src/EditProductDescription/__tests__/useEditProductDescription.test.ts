import { type ApolloCache, type OperationVariables } from '@apollo/client';
import { useQuery, useMutation, type MutationHookOptions } from '@apollo/client/react';
import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';

// ── Mock: @apollo/client/react to avoid ApolloProvider requirement ─────
vi.mock('@apollo/client/react', async importOriginal => {
  const actual = await importOriginal();
  return {
    ...(actual as Record<string, unknown>),
    useQuery: vi.fn(),
    useMutation: vi.fn(),
  };
});

// ── Mock: @mantine/form ──────────────────────────────────────────
const mockForm = {
  reset: vi.fn(),
  setInitialValues: vi.fn(),
  getInputProps: vi.fn(() => ({ key: 'test-form-key', defaultValue: '' })),
  onSubmit: vi.fn((handler: (values: { description?: string }) => Promise<void>) => handler),
};

vi.mock('@mantine/form', () => ({
  useForm: vi.fn(() => mockForm),
}));

// ── Mock: @mantine/notifications ─────────────────────────────────
vi.mock('@mantine/notifications', () => ({
  notifications: { show: vi.fn() },
}));

// ── Import after mocks ───────────────────────────────────────────
import { useEditProductDescription } from '../useEditProductDescription';

describe('useEditProductDescription', () => {
  const defaultSlug = 'test-product-slug';
  type MockMutationOptions = MutationHookOptions<unknown, OperationVariables, unknown, ApolloCache>;
  let mutationOnCompleted:
    | ((data: { editProduct: { product: { id: string; description?: string | null } } }) => void)
    | null = null;
  let mutateFn: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.clearAllMocks();
    mutationOnCompleted = null;
    mutateFn = vi.fn();

    // Default Apollo mocks
    vi.mocked(useQuery).mockReturnValue({ data: undefined } as ReturnType<typeof useQuery>);
    vi.mocked(useMutation).mockReturnValue([mutateFn, { loading: false }] as unknown as ReturnType<typeof useMutation>);
  });

  describe('mutation onCompleted', () => {
    beforeEach(() => {
      vi.mocked(useMutation).mockImplementation(((_query: unknown, options?: MockMutationOptions) => {
        if (options?.onCompleted) {
          mutationOnCompleted = options.onCompleted as typeof mutationOnCompleted;
        }
        return [mutateFn, { loading: false }] as unknown as ReturnType<typeof useMutation>;
      }) as typeof useMutation);
    });

    it('should preserve loaded description after mutation save', () => {
      renderHook(() => useEditProductDescription({ slug: defaultSlug }));

      act(() => {
        mutationOnCompleted!({
          editProduct: {
            product: {
              id: 'product-1',
              description: 'Will be saved',
            },
          },
        });
      });

      expect(mockForm.reset).not.toHaveBeenCalled();
    });
  });

  describe('defaultValue return value', () => {
    it('should return empty string when data is undefined', () => {
      vi.mocked(useQuery).mockReturnValue({ data: undefined } as ReturnType<typeof useQuery>);

      const { result } = renderHook(() => useEditProductDescription({ slug: defaultSlug }));

      expect(result.current.defaultValue).toBe('');
    });

    it('should reflect the loaded description when data is available', () => {
      vi.mocked(useQuery).mockReturnValue({
        data: {
          tempProductBySlug: {
            __typename: 'Product' as const,
            id: 'product-1',
            description: 'Direct data',
          },
        },
      } as ReturnType<typeof useQuery>);

      const { result } = renderHook(() => useEditProductDescription({ slug: defaultSlug }));

      expect(result.current.defaultValue).toBe('Direct data');
    });
  });

  describe('mutation failure handling', () => {
    beforeEach(() => {
      vi.mocked(useMutation).mockImplementation(((_query: unknown, options?: MockMutationOptions) => {
        if (options?.onCompleted) {
          mutationOnCompleted = options.onCompleted as typeof mutationOnCompleted;
        }
        return [mutateFn, { loading: false }] as unknown as ReturnType<typeof useMutation>;
      }) as typeof useMutation);
    });

    it('should rethrow when mutation rejects', async () => {
      const onSubmit = vi.fn();
      const { result } = renderHook(() => useEditProductDescription({ slug: defaultSlug, onSubmit }));

      mutateFn.mockRejectedValueOnce(new Error('Network error'));

      await expect(
        act(async () => {
          await result.current.submit({ description: 'New description' });
        })
      ).rejects.toThrow('Network error');

      expect(onSubmit).not.toHaveBeenCalled();
    });
  });

  describe('submit function', () => {
    beforeEach(() => {
      vi.mocked(useMutation).mockImplementation(((_query: unknown, options?: MockMutationOptions) => {
        if (options?.onCompleted) {
          mutationOnCompleted = options.onCompleted as typeof mutationOnCompleted;
        }
        return [mutateFn, { loading: false }] as unknown as ReturnType<typeof useMutation>;
      }) as typeof useMutation);
    });

    it('should show error notification when description is empty', async () => {
      const { result } = renderHook(() => useEditProductDescription({ slug: defaultSlug }));
      const { notifications } = await import('@mantine/notifications');

      await act(async () => {
        await result.current.submit({ description: '' });
      });

      expect(notifications.show).toHaveBeenCalledWith(expect.objectContaining({ color: 'red' }));
      expect(mutateFn).not.toHaveBeenCalled();
    });

    it('should call mutation with description when provided', async () => {
      const onSubmit = vi.fn();
      const { result } = renderHook(() => useEditProductDescription({ slug: defaultSlug, onSubmit }));

      mutateFn.mockResolvedValueOnce({
        data: {
          editProduct: {
            product: { id: 'product-1', description: 'New description' },
          },
        },
      });

      await act(async () => {
        await result.current.submit({ description: 'New description' });
      });

      expect(mutateFn).toHaveBeenCalledWith({
        variables: {
          slug: defaultSlug,
          input: { description: 'New description' },
        },
      });
    });

    it('should call onCompleted and onSubmit after mutation succeeds', async () => {
      const onSubmit = vi.fn();
      const { result } = renderHook(() => useEditProductDescription({ slug: defaultSlug, onSubmit }));

      mutateFn.mockResolvedValueOnce({
        data: {
          editProduct: {
            product: { id: 'product-1', description: 'New description' },
          },
        },
      });

      await act(async () => {
        await result.current.submit({ description: 'New description' });
      });

      // The mock captures onCompleted but does not auto-call it;
      // simulate Apollo's post-mutation onCompleted trigger.
      act(() => {
        mutationOnCompleted!({
          editProduct: { product: { id: 'product-1', description: 'New description' } },
        });
      });

      expect(onSubmit).toHaveBeenCalled();
    });
  });
});

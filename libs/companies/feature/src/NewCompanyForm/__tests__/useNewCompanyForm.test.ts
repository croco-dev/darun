// @vitest-environment jsdom
import { useMutation } from '@apollo/client/react';
import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockPush = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush }),
}));

vi.mock('@apollo/client/react', () => ({
  useMutation: vi.fn(),
}));

vi.mock('@mantine/notifications', () => ({
  notifications: { show: vi.fn() },
}));

import { useNewCompanyForm } from '../useNewCompanyForm';

describe('useNewCompanyForm', () => {
  let mutateFn: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.clearAllMocks();
    mutateFn = vi.fn();
    vi.mocked(useMutation).mockReturnValue([mutateFn, { loading: false }] as unknown as ReturnType<typeof useMutation>);
  });

  it('negative control: initializes with loading: false', () => {
    const { result } = renderHook(() => useNewCompanyForm());
    expect(result.current.loading).toBe(false);
  });

  it('does not submit when required fields are missing', async () => {
    const { result } = renderHook(() => useNewCompanyForm());

    await act(async () => {
      await result.current.handleSubmit({
        name: '',
        type: '',
        address: '',
        startAt: null,
        startAtIsDisabled: false,
      });
    });

    expect(mutateFn).not.toHaveBeenCalled();
  });

  it('calls mutate with formatted variables on valid submission', async () => {
    mutateFn.mockResolvedValueOnce({ data: { createCompany: { company: { id: 'c1' } } } });
    const { result } = renderHook(() => useNewCompanyForm());

    await act(async () => {
      await result.current.handleSubmit({
        name: 'Darun Inc',
        type: 'Startup',
        address: 'Seoul, Korea',
        startAt: new Date('2024-01-01T00:00:00.000Z'),
        startAtIsDisabled: false,
      });
    });

    expect(mutateFn).toHaveBeenCalledWith({
      variables: {
        input: {
          name: 'Darun Inc',
          type: 'Startup',
          address: 'Seoul, Korea',
          startAt: '2024-01-01T00:00:00.000Z',
        },
      },
    });
  });

  it('prevents synchronous double-clicks while submission is in-flight', async () => {
    let resolveMutate: () => void;
    mutateFn.mockImplementation(
      () =>
        new Promise(resolve => {
          resolveMutate = () => resolve({ data: { createCompany: { company: { id: 'c1' } } } });
        })
    );

    const { result } = renderHook(() => useNewCompanyForm());

    const validValues = {
      name: 'Darun Inc',
      type: 'Startup',
      address: 'Seoul, Korea',
      startAt: null,
      startAtIsDisabled: false,
    };

    let p1: Promise<void>;
    let p2: Promise<void>;
    act(() => {
      p1 = result.current.handleSubmit(validValues);
      p2 = result.current.handleSubmit(validValues);
    });

    expect(mutateFn).toHaveBeenCalledTimes(1);

    await act(async () => {
      resolveMutate!();
      await Promise.all([p1, p2]);
    });
  });
});

// @vitest-environment jsdom
import { ApolloClient, ApolloLink, InMemoryCache, Observable } from '@apollo/client';
import { ApolloProvider } from '@apollo/client/react';
import { act, cleanup, renderHook } from '@testing-library/react';
import React from 'react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { useWriteMagazine } from '../../../libs/magazines/feature/src/WriteMagazine/useWriteMagazine';

const { upload } = vi.hoisted(() => ({ upload: vi.fn() }));
vi.mock('@darun/utils-image-upload', () => ({
  useImageUpload: () => ({ upload }),
}));
vi.mock('@darun/utils-router', () => ({ useNavigate: () => vi.fn() }));
vi.mock('@mantine/notifications', () => ({ notifications: { show: vi.fn() } }));
const clients: ApolloClient[] = [];
const first = new File(['first'], 'first.png', { type: 'image/png' });
const replacement = new File(['replacement'], 'replacement.png', {
  type: 'image/png',
});
const firstUrl = 'https://images.example.test/first.png';
const replacementUrl = 'https://images.example.test/replacement.png';

function setup() {
  const writes: unknown[] = [];
  const client = new ApolloClient({
    cache: new InMemoryCache(),
    link: new ApolloLink(
      operation =>
        new Observable(observer => {
          writes.push(operation.variables.input);
          observer.next({
            data: {
              createMagazine: {
                magazine: {
                  __typename: 'Magazine',
                  id: 'draft',
                  slug: 'draft',
                },
              },
            },
          });
          observer.complete();
        })
    ),
  });
  clients.push(client);
  const hook = renderHook(useWriteMagazine, {
    wrapper: ({ children }: { children: React.ReactNode }) => (
      <ApolloProvider client={client}>{children}</ApolloProvider>
    ),
  });
  act(() =>
    hook.result.current.form.setValues({
      title: '보존할 제목',
      summary: '보존할 요약',
    })
  );
  return { ...hook, writes };
}

beforeEach(() => {
  vi.spyOn(URL, 'createObjectURL').mockImplementation(blob => `blob:${(blob as File).name}`);
  vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});
});
afterEach(() => {
  cleanup();
  clients.splice(0).forEach(client => client.stop());
  vi.restoreAllMocks();
  vi.resetAllMocks();
});

it.each(['rejection', 'empty response'])(
  'restores the successful selection after replacement %s and submits its URL',
  async failure => {
    const { result, writes } = setup();
    upload.mockResolvedValueOnce(firstUrl);
    await act(async () => {
      await result.current.handleFileDrop([first]);
    });
    let finish!: (url?: string) => void;
    let fail!: (error: Error) => void;
    upload.mockReturnValueOnce(
      new Promise<string | undefined>((resolve, reject) => {
        finish = resolve;
        fail = reject;
      })
    );
    let task!: Promise<void>;
    act(() => {
      task = result.current.handleFileDrop([replacement]);
    });
    expect(result.current.isUploading).toBe(true);
    expect(result.current.previewUrl).toBe('blob:replacement.png');
    expect(URL.revokeObjectURL).not.toHaveBeenCalledWith('blob:first.png');
    await act(async () => {
      if (failure === 'rejection') fail(new Error('synthetic failure'));
      else finish(undefined);
      await task;
    });
    expect(result.current.file).toBe(first);
    expect(result.current.previewUrl).toBe('blob:first.png');
    expect(result.current.form.getValues()).toMatchObject({
      title: '보존할 제목',
      summary: '보존할 요약',
      backgroundImageUrl: firstUrl,
    });
    expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:replacement.png');
    expect(URL.revokeObjectURL).not.toHaveBeenCalledWith('blob:first.png');
    await act(async () => {
      await result.current.handleSubmit(result.current.form.getValues());
    });
    expect(writes).toEqual([expect.objectContaining({ backgroundImageUrl: firstUrl })]);
  }
);

it('commits a successful replacement and only explicit removal submits an empty background', async () => {
  const { result, writes, unmount } = setup();
  upload.mockResolvedValueOnce(firstUrl).mockResolvedValueOnce(replacementUrl);
  await act(async () => {
    await result.current.handleFileDrop([first]);
  });
  await act(async () => {
    await result.current.handleFileDrop([replacement]);
  });
  expect(result.current.file).toBe(replacement);
  expect(result.current.form.getValues().backgroundImageUrl).toBe(replacementUrl);
  expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:first.png');
  expect(URL.revokeObjectURL).not.toHaveBeenCalledWith('blob:replacement.png');
  act(() => result.current.handleFileRemove());
  expect(result.current.file).toBeNull();
  expect(result.current.previewUrl).toBeNull();
  expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:replacement.png');
  await act(async () => {
    await result.current.handleSubmit(result.current.form.getValues());
  });
  expect(writes).toEqual([expect.objectContaining({ backgroundImageUrl: '' })]);
  unmount();
  expect(URL.revokeObjectURL).toHaveBeenCalledTimes(2);
});

it('keeps no accepted selection after the first failure and can retry the selected file', async () => {
  const { result } = setup();
  upload.mockRejectedValueOnce(new Error('synthetic failure'));
  await act(async () => {
    await result.current.handleFileDrop([first]);
  });
  expect(result.current.file).toBeNull();
  expect(result.current.previewUrl).toBeNull();
  expect(result.current.form.getValues().backgroundImageUrl).toBe('');
  expect(result.current.retryFile).toBe(first);
  upload.mockResolvedValueOnce(firstUrl);
  await act(async () => {
    await result.current.handleFileDrop([result.current.retryFile!]);
  });
  expect(result.current.file).toBe(first);
  expect(result.current.form.getValues().backgroundImageUrl).toBe(firstUrl);
  expect(result.current.retryFile).toBeNull();
});

it('restores the accepted preview on cancellation and ignores a late result after a new upload', async () => {
  const { result, unmount } = setup();
  upload.mockResolvedValueOnce(firstUrl);
  await act(async () => {
    await result.current.handleFileDrop([first]);
  });
  let resolveOld!: (url: string) => void;
  upload.mockReturnValueOnce(
    new Promise<string>(resolve => {
      resolveOld = resolve;
    })
  );
  let task!: Promise<void>;
  act(() => {
    task = result.current.handleFileDrop([replacement]);
  });
  act(() => result.current.handleUploadCancel());
  expect(result.current.previewUrl).toBe('blob:first.png');
  expect(result.current.file).toBe(first);
  upload.mockResolvedValueOnce(replacementUrl);
  await act(async () => {
    await result.current.handleFileDrop([replacement]);
  });
  await act(async () => {
    resolveOld('https://images.example.test/late.png');
    await task;
  });
  expect(result.current.form.getValues().backgroundImageUrl).toBe(replacementUrl);
  expect(result.current.file).toBe(replacement);
  unmount();
  expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:replacement.png');
});

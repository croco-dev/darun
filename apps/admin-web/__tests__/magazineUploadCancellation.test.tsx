// @vitest-environment jsdom
import { ApolloClient, ApolloLink, InMemoryCache } from '@apollo/client';
import { ApolloProvider } from '@apollo/client/react';
import { notifications } from '@mantine/notifications';
import { act, cleanup, renderHook } from '@testing-library/react';
import React from 'react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { useWriteMagazine } from '../../../libs/magazines/feature/src/WriteMagazine/useWriteMagazine';

const { upload, navigate } = vi.hoisted(() => ({ upload: vi.fn(), navigate: vi.fn() }));
vi.mock('@darun/utils-image-upload', () => ({ useImageUpload: () => ({ upload }) }));
vi.mock('@darun/utils-router', () => ({ useNavigate: () => navigate }));
vi.mock('@mantine/notifications', () => ({ notifications: { show: vi.fn() } }));

const clients: ApolloClient[] = [];
const previousUrl = 'https://images.example.test/previous.png';
const file = new File(['replacement'], 'replacement.png', { type: 'image/png' });

function pendingUpload() {
  let resolve!: (url: string) => void;
  const promise = new Promise<string>(done => {
    resolve = done;
  });
  upload.mockReturnValueOnce(promise);
  return { resolve };
}

function setup() {
  const write = vi.fn();
  const client = new ApolloClient({ cache: new InMemoryCache(), link: new ApolloLink(write) });
  clients.push(client);
  const hook = renderHook(useWriteMagazine, {
    wrapper: ({ children }: { children: React.ReactNode }) => (
      <ApolloProvider client={client}>{children}</ApolloProvider>
    ),
  });
  act(() =>
    hook.result.current.form.setValues({ title: '보존할 글', summary: '보존할 요약', backgroundImageUrl: previousUrl })
  );
  return { ...hook, write };
}

beforeEach(() => {
  vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:replacement');
  vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});
});

afterEach(() => {
  cleanup();
  clients.splice(0).forEach(client => client.stop());
  vi.restoreAllMocks();
  vi.resetAllMocks();
});

it('ignores a successful upload arriving after the magazine form unmounts', async () => {
  const pending = pendingUpload();
  const { result, unmount, write } = setup();
  let task!: Promise<void>;
  act(() => {
    task = result.current.handleFileDrop([file]);
  });
  expect(result.current.isUploading).toBe(true);
  unmount();
  expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:replacement');
  expect(URL.revokeObjectURL).toHaveBeenCalledTimes(1);
  await act(async () => {
    pending.resolve('https://images.example.test/late.png');
    await task;
  });
  expect(URL.revokeObjectURL).toHaveBeenCalledTimes(1);
  expect(notifications.show).not.toHaveBeenCalled();
  expect(write).not.toHaveBeenCalled();
  expect(navigate).not.toHaveBeenCalled();
});

it('preserves text, selected file and saved background on timeout for a retry', async () => {
  upload.mockRejectedValueOnce(new DOMException('Deadline exceeded', 'TimeoutError'));
  const { result } = setup();
  await act(async () => {
    await result.current.handleFileDrop([file]);
  });
  expect(result.current.isUploading).toBe(false);
  expect(result.current.form.getValues()).toMatchObject({
    title: '보존할 글',
    summary: '보존할 요약',
    backgroundImageUrl: previousUrl,
  });
  expect(result.current.file).toBeNull();
  expect(result.current.retryFile).toBe(file);
  expect(result.current.previewUrl).toBeNull();
  expect(notifications.show).toHaveBeenCalledWith(expect.objectContaining({ color: 'red' }));
  upload.mockResolvedValueOnce('https://images.example.test/retried.png');
  await act(async () => {
    await result.current.handleFileDrop([file]);
  });
  expect(result.current.form.getValues().backgroundImageUrl).toBe('https://images.example.test/retried.png');
  expect(result.current.isUploading).toBe(false);
});

it('cancels an upload and ignores its late completion while a retry is pending', async () => {
  const old = pendingUpload();
  const retry = pendingUpload();
  const { result, write } = setup();
  let first!: Promise<void>;
  let second!: Promise<void>;
  act(() => {
    first = result.current.handleFileDrop([file]);
  });
  const firstSignal = upload.mock.calls[0]![3] as AbortSignal;
  act(() => {
    result.current.handleUploadCancel();
  });
  expect(firstSignal.aborted).toBe(true);
  expect(result.current.isUploading).toBe(false);
  expect(result.current.file).toBeNull();
  expect(result.current.retryFile).toBe(file);
  act(() => {
    second = result.current.handleFileDrop([file]);
  });
  await act(async () => {
    old.resolve('https://images.example.test/old.png');
    await first;
  });
  expect(result.current.isUploading).toBe(true);
  expect(result.current.form.getValues().backgroundImageUrl).toBe(previousUrl);
  expect(notifications.show).not.toHaveBeenCalled();
  await act(async () => {
    retry.resolve('https://images.example.test/new.png');
    await second;
  });
  expect(result.current.form.getValues().backgroundImageUrl).toBe('https://images.example.test/new.png');
  expect(result.current.isUploading).toBe(false);
  expect(write).not.toHaveBeenCalled();
});

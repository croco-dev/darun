// @vitest-environment jsdom
import { ApolloClient, ApolloLink, InMemoryCache, Observable } from '@apollo/client';
import { ApolloProvider } from '@apollo/client/react';
import { notifications } from '@mantine/notifications';
import { act, cleanup, renderHook } from '@testing-library/react';
import React from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { parseEnv } from 'node:util';
import { useWriteMagazine } from '../../../libs/magazines/feature/src/WriteMagazine/useWriteMagazine';
import { useNewProductForm } from '../../../libs/products/feature/src/NewProductForm/useNewProductForm';
import { useNewProductScreenshotForm } from '../../../libs/products/feature/src/NewProductScreenshotForm/useNewProductScreenshotForm';
import { useImageUpload } from '../../../libs/shared/utils-image-upload/src/useImageUpload';

const { navigate } = vi.hoisted(() => ({ navigate: vi.fn() }));
vi.mock('@darun/utils-router', () => ({ useNavigate: () => navigate }));
vi.mock('@mantine/notifications', () => ({
  notifications: { show: vi.fn(), update: vi.fn() },
}));

const clients: ApolloClient[] = [];
const cloudNameKey = 'NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME';
const apiKeyKey = 'NEXT_PUBLIC_CLOUDINARY_API_KEY';

function setup() {
  const operations: { name: string; variables: Record<string, unknown> }[] = [];
  const client = new ApolloClient({
    cache: new InMemoryCache(),
    link: new ApolloLink(
      operation =>
        new Observable(observer => {
          operations.push({ name: operation.operationName ?? '', variables: operation.variables });
          if (operation.operationName !== 'SignImageUpload') {
            observer.error(new Error('Unexpected write during upload setup check'));
            return;
          }
          observer.next({
            data: {
              signImageUpload: { signature: 'fixture-signature', folder: 'local/signed', timestamp: 1760000000 },
            },
          });
          observer.complete();
        })
    ),
  });
  clients.push(client);
  const fetchUpload = vi.fn().mockResolvedValue({
    ok: true,
    json: async () => ({ secure_url: 'https://images.example.test/uploaded.png' }),
  });
  vi.stubGlobal('fetch', fetchUpload);
  return {
    operations,
    fetchUpload,
    wrapper: ({ children }: { children: React.ReactNode }) => (
      <ApolloProvider client={client}>{children}</ApolloProvider>
    ),
  };
}

afterEach(() => {
  cleanup();
  clients.splice(0).forEach(client => client.stop());
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
  vi.clearAllMocks();
});

describe('admin browser image upload setup', () => {
  it.each(['images/logos', 'images/screenshots/fixture-app', 'images/magazines'])(
    'reaches signing and upload for %s using only documented sample keys',
    async folder => {
      const sample = parseEnv(readFileSync('.env.sample', 'utf8'));
      expect(sample).toHaveProperty(cloudNameKey);
      expect(sample).toHaveProperty(apiKeyKey);
      expect(sample).not.toHaveProperty('CLOUDINARY_API_SECRET');
      const filledSample = { ...sample, [cloudNameKey]: 'fixture-cloud', [apiKeyKey]: 'fixture-public-key' };
      for (const [key, value] of Object.entries(filledSample)) vi.stubEnv(key, value);
      const fixture = setup();
      const { result } = renderHook(useImageUpload, { wrapper: fixture.wrapper });
      const file = new File(['image'], 'fixture.png', { type: 'image/png' });
      let url: string | undefined;
      await act(async () => {
        url = await result.current.upload(folder, file, 'fixture-image');
      });
      expect(url).toBe('https://images.example.test/uploaded.png');
      expect(fixture.operations).toEqual([
        { name: 'SignImageUpload', variables: { input: { folder, displayName: expect.any(String) } } },
      ]);
      expect(fixture.fetchUpload).toHaveBeenCalledTimes(1);
      const [endpoint, request] = fixture.fetchUpload.mock.calls[0]!;
      expect(endpoint).toBe('https://api.cloudinary.com/v1_1/fixture-cloud/auto/upload');
      const body = request.body as FormData;
      expect(body.get('api_key')).toBe('fixture-public-key');
      expect(body.get('signature')).toBe('fixture-signature');
      expect(body.get('folder')).toBe('local/signed');
      expect(body.get('public_id')).toBe(
        (fixture.operations[0]!.variables.input as { displayName: string }).displayName
      );
      expect(body.get('api_secret')).toBeNull();
    }
  );

  it.each([cloudNameKey, apiKeyKey])('explains a missing %s without signing or uploading', async missing => {
    vi.stubEnv(cloudNameKey, 'fixture-cloud');
    vi.stubEnv(apiKeyKey, 'fixture-public-key');
    vi.stubEnv(missing, '');
    const fixture = setup();
    const { result } = renderHook(useImageUpload, { wrapper: fixture.wrapper });
    await act(async () => {
      expect(await result.current.upload('images/logos', new File(['image'], 'logo.png'), 'logo')).toBeUndefined();
    });
    expect(notifications.show).toHaveBeenCalledWith({ message: expect.stringContaining('설정이 누락'), color: 'red' });
    expect(fixture.operations).toEqual([]);
    expect(fixture.fetchUpload).not.toHaveBeenCalled();
  });

  it('keeps product and screenshot input, including the selected file, after missing-configuration submissions', async () => {
    vi.stubEnv(cloudNameKey, '');
    vi.stubEnv(apiKeyKey, '');
    const fixture = setup();
    const props = { productSlug: 'fixture-app', children: () => null };
    const product = renderHook(() => useNewProductForm(props), { wrapper: fixture.wrapper });
    const screenshot = renderHook(() => useNewProductScreenshotForm(props), { wrapper: fixture.wrapper });
    const file = new File(['image'], 'draft.png', { type: 'image/png' });
    const productValues = { name: '작성 중인 앱', slug: 'draft-app', summary: '보존할 요약', file };
    const screenshotValues = { imageAlt: '보존할 화면 설명', title: '작성 중인 화면', file };
    await act(async () => {
      product.result.current.form.setValues(productValues);
      screenshot.result.current.form.setValues(screenshotValues);
    });
    for (let attempt = 0; attempt < 2; attempt++) {
      await act(async () => {
        await product.result.current.submit(productValues);
        await screenshot.result.current.submit(screenshotValues);
      });
      expect(product.result.current.form.getValues()).toMatchObject(productValues);
      expect(screenshot.result.current.form.getValues()).toMatchObject(screenshotValues);
      expect(product.result.current.loading).toBe(false);
      expect(screenshot.result.current.loading).toBe(false);
    }
    expect(fixture.operations).toEqual([]);
    expect(fixture.fetchUpload).not.toHaveBeenCalled();
    expect(navigate).not.toHaveBeenCalled();
  });

  it('keeps magazine text and its existing background when upload configuration is missing', async () => {
    vi.stubEnv(cloudNameKey, '');
    vi.stubEnv(apiKeyKey, '');
    const fixture = setup();
    const createObjectURL = vi.fn(() => 'blob:fixture-preview');
    vi.stubGlobal(
      'URL',
      class extends URL {
        static createObjectURL = createObjectURL;
        static revokeObjectURL = vi.fn();
      }
    );
    const { result } = renderHook(useWriteMagazine, { wrapper: fixture.wrapper });
    const values = {
      title: '작성 중인 글',
      summary: '보존할 요약',
      backgroundImageUrl: 'https://images.example.test/previous.png',
    };
    await act(async () => {
      result.current.form.setValues(values);
    });
    await act(async () => {
      await result.current.handleFileDrop([new File(['new image'], 'replacement.png', { type: 'image/png' })]);
    });
    expect(result.current.form.getValues()).toMatchObject(values);
    expect(result.current.file).toBeNull();
    expect(result.current.isUploading).toBe(false);
    expect(createObjectURL).not.toHaveBeenCalled();
    expect(notifications.show).toHaveBeenCalledWith({ message: expect.stringContaining('설정이 누락'), color: 'red' });
    expect(fixture.operations).toEqual([]);
    expect(fixture.fetchUpload).not.toHaveBeenCalled();
  });
});

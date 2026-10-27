import 'reflect-metadata';
import { ApolloClient, ApolloLink, InMemoryCache, Observable } from '@apollo/client';
import { ApolloProvider } from '@apollo/client/react';
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import React from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { SignImageUpload } from '../../../../images/domain/src/usecases/SignImageUpload';
import { useNewProductScreenshotForm } from '../NewProductScreenshotForm/useNewProductScreenshotForm';

const { navigate } = vi.hoisted(() => ({ navigate: vi.fn() }));
vi.mock('@darun/utils-router', () => ({ useNavigate: () => navigate }));
vi.mock('@mantine/notifications', () => ({
  notifications: { show: vi.fn(), update: vi.fn() },
}));

function ScreenshotForm() {
  const { form, submit, loading } = useNewProductScreenshotForm({
    productSlug: 'example-app',
    children: () => null,
  });
  return (
    <form onSubmit={form.onSubmit(submit)}>
      <input
        aria-label="스크린샷"
        type="file"
        onChange={event => form.setFieldValue('file', event.target.files?.[0])}
      />
      <input key={form.key('imageAlt')} aria-label="설명" {...form.getInputProps('imageAlt')} />
      <button type="submit" disabled={loading}>
        저장
      </button>
    </form>
  );
}

const clients: ApolloClient[] = [];
afterEach(async () => {
  cleanup();
  await act(async () => clients.splice(0).forEach(client => client.stop()));
  vi.restoreAllMocks();
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
  vi.clearAllMocks();
});

describe('스크린샷 파일명과 업로드 서명', () => {
  it.each([
    'screen..final.png',
    'screen...draft..final.png',
    '화면.. 최종.png',
    'screen final.png',
    'screen.final.backup.png',
    `${'a'.repeat(62)}..final.png`,
  ])('%s를 실제 서명 검증을 거쳐 같은 public_id로 업로드한다', async filename => {
    vi.stubEnv('NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME', 'fixture-cloud');
    vi.stubEnv('NEXT_PUBLIC_CLOUDINARY_API_KEY', 'fixture-key');
    vi.spyOn(crypto, 'randomUUID')
      .mockReturnValueOnce('01234567-89ab-4cde-8012-3456789abcde')
      .mockReturnValueOnce('fedcba98-7654-4321-8012-3456789abcde');

    const signatures: { uploadFolder: string; displayName: string }[] = [];
    const signer = new SignImageUpload({
      signImageUpload(input) {
        signatures.push(input);
        return {
          signature: `signed-${input.displayName}`,
          timestamp: 1700000000,
          folder: input.uploadFolder,
        };
      },
    });
    const savedInputs: { imageUrl: string; imageAlt: string }[] = [];
    const client = new ApolloClient({
      cache: new InMemoryCache(),
      link: new ApolloLink(
        operation =>
          new Observable(observer => {
            try {
              if (operation.operationName === 'SignImageUpload') {
                observer.next({
                  data: {
                    signImageUpload: signer.execute(operation.variables.input),
                  },
                });
              } else if (operation.operationName === 'AddProductScreenshotOnNewProductScreenshotForm') {
                savedInputs.push(operation.variables.input);
                observer.next({
                  data: {
                    addProductScreenshot: {
                      product: { id: 'product-1', screenshots: [] },
                    },
                  },
                });
              } else if (operation.operationName === 'GetProductScreenshotsOnDetailSection') {
                observer.next({ data: { tempProductBySlug: null } });
              } else {
                throw new Error(`Unexpected operation: ${operation.operationName}`);
              }
              observer.complete();
            } catch (error) {
              observer.error(error);
            }
          })
      ),
    });
    clients.push(client);
    const uploaded: FormData[] = [];
    const fetchUpload = vi.fn(async (_url: string, init: RequestInit) => {
      uploaded.push(init.body as FormData);
      return {
        ok: true,
        json: async () => ({
          secure_url: 'https://fixture.invalid/screen.png',
        }),
      };
    });
    vi.stubGlobal('fetch', fetchUpload);
    const file = new File(['image-bytes'], filename, { type: 'image/png' });
    for (let index = 0; index < 2; index++) {
      render(
        <ApolloProvider client={client}>
          <ScreenshotForm />
        </ApolloProvider>
      );
      fireEvent.change(screen.getByLabelText('스크린샷'), {
        target: { files: [file] },
      });
      fireEvent.change(screen.getByLabelText('설명'), {
        target: { value: '앱의 검색 화면' },
      });
      fireEvent.click(screen.getByRole('button', { name: '저장' }));
      await waitFor(() => expect(savedInputs).toHaveLength(index + 1));
      await waitFor(() => expect(navigate).toHaveBeenCalledTimes(index + 1));
      await waitFor(() =>
        expect((screen.getByRole('button', { name: '저장' }) as HTMLButtonElement).disabled).toBe(false)
      );
      cleanup();
    }

    expect(signatures).toHaveLength(2);
    expect(signatures[0].displayName).not.toBe(signatures[1].displayName);
    expect(signatures.map(input => input.displayName.slice(-12))).toEqual(['0123456789ab', 'fedcba987654']);
    expect(fetchUpload).toHaveBeenCalledTimes(2);
    for (const [index, body] of uploaded.entries()) {
      const signed = signatures[index];
      expect(signed.displayName).not.toContain('..');
      expect(body.get('public_id')).toBe(signed.displayName);
      expect(body.get('signature')).toBe(`signed-${signed.displayName}`);
      expect(body.get('folder')).toBe('images/screenshots/example-app');
      expect(body.get('timestamp')).toBe('1700000000');
      expect(body.get('file')).toBe(file);
      expect((body.get('file') as File).name).toBe(filename);
      expect(savedInputs[index]).toMatchObject({
        imageUrl: 'https://fixture.invalid/screen.png',
        imageAlt: '앱의 검색 화면',
      });
    }
    expect(file.name).toBe(filename);
    expect(navigate).toHaveBeenCalledWith('/products/example-app');
  });
});

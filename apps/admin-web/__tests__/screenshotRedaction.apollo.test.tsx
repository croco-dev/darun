// @vitest-environment jsdom
import { ApolloClient, ApolloLink, InMemoryCache, Observable } from '@apollo/client';
import { ApolloProvider } from '@apollo/client/react';
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { NewProductScreenshotFormSection } from '../features/products/NewProductScreenshotFormSection/NewProductScreenshotFormSection';

vi.mock('@darun/utils-router', async importOriginal => ({
  ...(await importOriginal<typeof import('@darun/utils-router')>()),
  useNavigate: () => vi.fn(),
}));
vi.mock('@mantine/notifications', () => ({ notifications: { show: vi.fn() } }));

const clients: ApolloClient[] = [];
afterEach(() => {
  cleanup();
  clients.splice(0).forEach(client => client.stop());
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

const source = (name: string) => {
  const png = Uint8Array.from(
    Buffer.from(
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aC2kAAAAASUVORK5CYII=',
      'base64'
    )
  );
  const file = new File([png], name, { type: 'image/png' });
  Object.defineProperty(file, 'arrayBuffer', { value: async () => png.buffer });
  return file;
};

const choose = (file: File) => fireEvent.change(screen.getByLabelText('이미지'), { target: { files: [file] } });
const button = (name: string) => screen.getByRole<HTMLButtonElement>('button', { name: new RegExp(`^${name}$`) });
const submit = async () => act(async () => void fireEvent.submit(button('추가').form!));

function mountForm() {
  vi.stubEnv('NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME', 'fixture-cloud');
  vi.stubEnv('NEXT_PUBLIC_CLOUDINARY_API_KEY', 'fixture-key');
  vi.stubGlobal(
    'URL',
    class extends URL {
      static createObjectURL = vi.fn(() => 'blob:fixture');
      static revokeObjectURL = vi.fn();
    }
  );
  const decode = vi.fn(async () => ({ width: 72, height: 38, close: vi.fn() }));
  vi.stubGlobal('createImageBitmap', decode);
  const painted: [string, number, number, number, number][] = [];
  const swatch = document.createElement('span');
  const draw = {
    fillStyle: '',
    drawImage: vi.fn(),
    fillRect(left: number, top: number, width: number, height: number) {
      swatch.style.color = this.fillStyle;
      painted.push([swatch.style.color, left, top, width, height]);
    },
  };
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(draw as unknown as CanvasRenderingContext2D);
  const encode = vi
    .spyOn(HTMLCanvasElement.prototype, 'toBlob')
    .mockImplementation(callback => callback(new Blob(['generated image fixture'], { type: 'image/png' })));
  const upload = vi.fn().mockResolvedValue({
    ok: false,
    json: async () => ({ message: 'fixture upload rejected' }),
  });
  vi.stubGlobal('fetch', upload);
  const operations: { name: string; variables: Record<string, unknown> }[] = [];
  const client = new ApolloClient({
    cache: new InMemoryCache(),
    link: new ApolloLink(
      operation =>
        new Observable(observer => {
          operations.push({ name: operation.operationName ?? '', variables: operation.variables });
          if (operation.operationName !== 'SignImageUpload') {
            observer.error(new Error('Unexpected operation for a rejected upload'));
            return;
          }
          observer.next({
            data: {
              signImageUpload: { signature: 'fixture-signature', folder: 'fixture/signed', timestamp: 1760000000 },
            },
          });
          observer.complete();
        })
    ),
  });
  clients.push(client);
  render(
    <ApolloProvider client={client}>
      <NewProductScreenshotFormSection productSlug="fixture-app" />
    </ApolloProvider>
  );
  fireEvent.change(screen.getByLabelText('이미지 alt'), { target: { value: '작성하고 있는 설명' } });
  return { operations, upload, encode, decode, painted };
}

async function prepareResult() {
  fireEvent.click(await screen.findByRole('button', { name: '가림 영역 추가' }));
  fireEvent.click(button('가림 결과 만들기'));
  const preview = await screen.findByAltText('등록할 가림 결과');
  expect(button('이 결과 사용').disabled).toBe(true);
  fireEvent.load(preview);
}

it('sends only the confirmed PNG, keeps it on a failed upload and invalidates it when the area changes', async () => {
  const { operations, upload, painted } = mountForm();
  const original = source('private-account-82347.png');
  choose(original);
  fireEvent.click(screen.getByRole('checkbox', { name: '업로드 전에 민감한 부분 가리기' }));
  await submit();
  await prepareResult();
  await submit();
  expect(operations).toEqual([]);
  expect(upload).not.toHaveBeenCalled();

  fireEvent.click(button('이 결과 사용'));
  await submit();
  expect(upload).toHaveBeenCalledTimes(1);
  const body = upload.mock.calls[0]![1].body as FormData;
  const sent = body.get('file') as File;
  expect(sent).not.toBe(original);
  expect(sent.name).toBe('redacted-screenshot.png');
  expect(sent.type).toBe('image/png');
  expect(painted).toEqual([['rgb(0, 0, 0)', 18, 9, 18, 10]]);
  const sentBytes = await new Promise<string | ArrayBuffer | null>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(reader.error);
    reader.readAsText(sent);
  });
  expect(sentBytes).toBe('generated image fixture');
  expect(body.get('public_id')).toMatch(/^redacted-screenshot\.png-[a-z0-9]+$/);
  expect(operations).toEqual([
    {
      name: 'SignImageUpload',
      variables: { input: { folder: 'images/screenshots/fixture-app', displayName: body.get('public_id') } },
    },
  ]);
  expect(screen.getByLabelText<HTMLInputElement>('이미지 alt').value).toBe('작성하고 있는 설명');
  expect(button('이 결과 사용').getAttribute('aria-pressed')).toBe('true');

  fireEvent.change(screen.getByLabelText('왼쪽'), { target: { value: '12' } });
  expect(screen.queryByAltText('등록할 가림 결과')).toBeNull();
  await submit();
  expect(upload).toHaveBeenCalledTimes(1);
});

it('blocks decode and composition failures, clears old regions on replacement and requires reselection after leaving', async () => {
  const { upload, encode, decode, operations } = mountForm();
  fireEvent.click(screen.getByRole('checkbox', { name: '업로드 전에 민감한 부분 가리기' }));
  decode.mockRejectedValueOnce(new Error('Fixture decode failure'));
  choose(source('bad.png'));
  await screen.findByText(/이미지를 읽을 수 없습니다/);
  await submit();

  choose(source('first.png'));
  fireEvent.click(await screen.findByRole('button', { name: '가림 영역 추가' }));
  encode.mockImplementationOnce(callback => callback(null));
  fireEvent.click(button('가림 결과 만들기'));
  await screen.findByText('가림 결과를 만들 수 없습니다.');
  expect(screen.getByRole('group', { name: '가림 영역 1 (px)' })).toBeTruthy();
  await submit();
  encode.mockImplementationOnce(callback =>
    callback(new Blob([new Uint8Array(10 * 1024 * 1024 + 1)], { type: 'image/png' }))
  );
  fireEvent.click(button('가림 결과 만들기'));
  await screen.findByText('가림 결과가 10MB를 초과합니다.');
  await submit();

  choose(source('second.png'));
  await waitFor(() => expect(button('가림 영역 추가').disabled).toBe(false));
  expect(screen.queryByRole('group', { name: '가림 영역 1 (px)' })).toBeNull();
  expect(button('가림 결과 만들기').disabled).toBe(true);
  fireEvent.click(screen.getByRole('checkbox', { name: '업로드 전에 민감한 부분 가리기' }));
  await submit();
  expect(operations).toEqual([]);
  expect(upload).not.toHaveBeenCalled();

  const raw = source('ordinary-screen.png');
  choose(raw);
  await submit();
  expect(upload).toHaveBeenCalledTimes(1);
  expect((upload.mock.calls[0]![1].body as FormData).get('file')).toBe(raw);
});

it('keeps intermediate keyboard input and blocks a stale upload until a valid area is confirmed again', async () => {
  const { operations, upload } = mountForm();
  choose(source('screen.png'));
  fireEvent.click(screen.getByRole('checkbox', { name: '업로드 전에 민감한 부분 가리기' }));
  await prepareResult();
  fireEvent.click(button('이 결과 사용'));

  const edge = screen.getByLabelText<HTMLInputElement>('오른쪽');
  fireEvent.change(edge, { target: { value: '2' } });
  expect(edge.value).toBe('2');
  expect(button('가림 결과 만들기').disabled).toBe(true);
  expect(button('추가').disabled).toBe(true);
  await submit();
  expect(operations).toEqual([]);
  expect(upload).not.toHaveBeenCalled();

  fireEvent.change(edge, { target: { value: '29' } });
  expect(edge.value).toBe('29');
  expect(button('가림 결과 만들기').disabled).toBe(false);
  expect(button('추가').disabled).toBe(true);
});

it('blocks submission of the old preview as soon as a new drag starts', async () => {
  const { operations, upload } = mountForm();
  choose(source('screen.png'));
  fireEvent.click(screen.getByRole('checkbox', { name: '업로드 전에 민감한 부분 가리기' }));
  await prepareResult();
  fireEvent.click(button('이 결과 사용'));

  const preview = screen.getByRole('img', { name: '가림 영역 미리보기' });
  vi.spyOn(preview, 'getBoundingClientRect').mockReturnValue(new DOMRect(0, 0, 72, 38));
  Object.defineProperty(preview, 'setPointerCapture', { value: vi.fn() });
  fireEvent(
    preview,
    Object.assign(new MouseEvent('pointerdown', { bubbles: true, button: 0, clientX: 39, clientY: 20 }), {
      pointerId: 1,
    })
  );
  fireEvent(
    preview,
    Object.assign(new MouseEvent('pointermove', { bubbles: true, clientX: 55, clientY: 31 }), { pointerId: 1 })
  );

  await submit();
  expect(operations).toEqual([]);
  expect(upload).not.toHaveBeenCalled();
  expect(button('가림 결과 만들기').disabled).toBe(true);
});

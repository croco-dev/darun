import { afterEach, expect, it, vi } from 'vitest';
import { decodeScreenshotForRedaction } from '../features/products/NewProductScreenshotFormSection/screenshotRedaction';

function pngChunk(name: string, data: Buffer<ArrayBuffer>) {
  const chunk = Buffer.alloc(12 + data.length);
  chunk.writeUInt32BE(data.length);
  chunk.write(name, 4, 'ascii');
  data.copy(chunk, 8);
  return chunk;
}

function pngHeader(width: number, height: number, animated = false) {
  const header = Buffer.alloc(13);
  header.writeUInt32BE(width);
  header.writeUInt32BE(height, 4);
  const chunks = [pngChunk('IHDR', header)];
  if (animated) chunks.push(pngChunk('acTL', Buffer.alloc(8)));
  chunks.push(pngChunk('IEND', Buffer.alloc(0)));
  return new File([Buffer.from('89504e470d0a1a0a', 'hex'), ...chunks], 'fixture.png', { type: 'image/png' });
}

afterEach(() => vi.unstubAllGlobals());

it('checks the encoded pixel count before browser decode', async () => {
  const decoded = { width: 5000, height: 4000, close: vi.fn() };
  const decode = vi.fn(async () => decoded);
  vi.stubGlobal('createImageBitmap', decode);

  await expect(decodeScreenshotForRedaction(pngHeader(5000, 4001))).rejects.toThrow(/2천만 픽셀/);
  expect(decode).not.toHaveBeenCalled();
  await expect(decodeScreenshotForRedaction(pngHeader(5000, 4000))).resolves.toBe(decoded);
  expect(decode).toHaveBeenCalledTimes(1);
});

it('rejects animated or mislabeled containers before browser decode', async () => {
  const decode = vi.fn();
  vi.stubGlobal('createImageBitmap', decode);
  const animatedWebp = new File(
    [Buffer.from('524946461600000057454250565038580a00000002000000000000000000', 'hex')],
    'fixture.webp',
    { type: 'image/webp' }
  );
  await expect(decodeScreenshotForRedaction(pngHeader(35, 19, true))).rejects.toThrow(/움직이는 이미지/);
  await expect(decodeScreenshotForRedaction(animatedWebp)).rejects.toThrow(/움직이는 이미지/);
  await expect(
    decodeScreenshotForRedaction(new File(['GIF89a'], 'mislabeled.png', { type: 'image/png' }))
  ).rejects.toThrow(/이미지를 읽을 수 없/);
  expect(decode).not.toHaveBeenCalled();
});

it.each([
  [
    'tiny.jpg',
    'image/jpeg',
    '/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAMCAgICAgMCAgIDAwMDBAYEBAQEBAgGBgUGCQgKCgkICQkKDA8MCgsOCwkJDRENDg8QEBEQCgwSExIQEw8QEBD/2wBDAQMDAwQDBAgEBAgQCwkLEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBD/wAARCAALAAcDAREAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAf/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFgEBAQEAAAAAAAAAAAAAAAAAAAcI/8QAFBEBAAAAAAAAAAAAAAAAAAAAAP/aAAwDAQACEQMRAD8AjiTtdgP/2Q==',
  ],
  [
    'tiny.webp',
    'image/webp',
    'UklGRjoAAABXRUJQVlA4IC4AAACwAQCdASoHAAsAAgA0JaACdLoABDAAAP7u09/8Buvi2mX/1Bn/lof+rQ/W4AAA',
  ],
  ['tiny-lossless.webp', 'image/webp', 'UklGRh4AAABXRUJQVlA4TBEAAAAvBoACAAfQmvYWpP+BiOh/AAA='],
])('accepts a static %s container before decoding', async (name, mime, fixture) => {
  const bitmap = { width: 7, height: 11, close: vi.fn() };
  const decode = vi.fn(async () => bitmap);
  vi.stubGlobal('createImageBitmap', decode);
  const file = new File([Buffer.from(fixture, 'base64')], name, { type: mime });

  await expect(decodeScreenshotForRedaction(file)).resolves.toBe(bitmap);
  expect(decode).toHaveBeenCalledOnce();
});

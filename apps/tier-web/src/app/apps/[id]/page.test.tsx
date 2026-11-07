// @vitest-environment jsdom
import { renderToStaticMarkup } from 'react-dom/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { parseAppleSearchResponse } from '../../admin/app-store-search';
import AppDetailPage, { generateMetadata } from './page';

const { query, from, notFound } = vi.hoisted(() => ({
  query: vi.fn(),
  from: vi.fn(),
  notFound: vi.fn(() => {
    throw new Error('NOT_FOUND');
  }),
}));

vi.mock('@/lib/supabase', () => ({ supabase: { from } }));
vi.mock('next/navigation', async importOriginal => ({
  ...(await importOriginal<typeof import('next/navigation')>()),
  notFound,
}));
vi.mock('@/components/MemoCard', () => ({ MemoCard: () => null }));

const id = '6be7cc23-4828-4e59-912c-99e646af140b';
const row = {
  id,
  ...parseAppleSearchResponse({
    results: [{ trackId: 123456789, trackName: 'Example', description: '</script><script>alert(1)</script>' }],
  })![0],
  tiers: { tier: 1 },
};
const params = (value = id) => ({ params: Promise.resolve({ id: value }) });

beforeEach(() => {
  vi.clearAllMocks();
  query.mockResolvedValue({ error: null, data: row });
  const result = { overrideTypes: query };
  from.mockReturnValue({
    select: () => ({
      eq: () => ({ single: () => result, maybeSingle: () => result }),
    }),
  });
});

it('uses the collected App Store ID in both links and keeps hostile metadata inside JSON-LD', async () => {
  const markup = renderToStaticMarkup(await AppDetailPage(params()));
  const container = document.createElement('div');
  container.innerHTML = markup;
  expect(container.querySelectorAll('script')).toHaveLength(1);
  const json = JSON.parse(container.querySelector('script')!.textContent!);
  const appStoreLink = container.querySelector('a[href^="https://apps.apple.com/"]');
  expect(appStoreLink?.getAttribute('href')).toBe('https://apps.apple.com/app/id123456789');
  expect(json.offers.url).toBe('https://apps.apple.com/app/id123456789');
  expect(json.description).toBe('</script><script>alert(1)</script>');
  expect(container.querySelector('h1')?.textContent).toBe('Example');
  expect(container.textContent).toContain('1티어');
});

describe('app detail and metadata read classification', () => {
  it('treats a successful empty read as missing in both consumers', async () => {
    query.mockResolvedValue({ data: null, error: null });
    await expect(AppDetailPage(params())).rejects.toThrow('NOT_FOUND');
    expect(await generateMetadata(params())).toEqual({
      title: '앱을 찾을 수 없음',
    });
  });

  it.each(['invalid', '123', `${id}suffix`, '6be7cc23-4828-4e59-912c-99e646af140z'])(
    'rejects malformed ID %s before querying',
    async value => {
      await expect(AppDetailPage(params(value))).rejects.toThrow('NOT_FOUND');
      expect(await generateMetadata(params(value))).toEqual({
        title: '앱을 찾을 수 없음',
      });
      expect(from).not.toHaveBeenCalled();
    }
  );

  it.each([
    { message: 'private upstream 503', code: '503' },
    { message: 'private timeout', code: '57014' },
    { message: 'multiple rows', code: 'PGRST116' },
  ])('propagates provider failures without converting them to missing: $code', async error => {
    query.mockResolvedValue({ data: null, error });
    await expect(AppDetailPage(params())).rejects.toThrow('앱 정보를 불러오지 못했습니다');
    await expect(generateMetadata(params())).rejects.toThrow('앱 정보를 불러오지 못했습니다');
    expect(notFound).not.toHaveBeenCalled();
  });

  it('preserves Next.js dynamic rendering control flow', async () => {
    const bailout = Object.assign(new Error('Dynamic server usage'), { digest: 'DYNAMIC_SERVER_USAGE' });
    query.mockRejectedValue(bailout);
    await expect(AppDetailPage(params())).rejects.toBe(bailout);
    await expect(generateMetadata(params())).rejects.toBe(bailout);
    expect(notFound).not.toHaveBeenCalled();
  });

  it('propagates a rejected transport and recovers both consumers on the same ID', async () => {
    query.mockRejectedValue(new Error('private network address'));
    await expect(AppDetailPage(params())).rejects.toThrow('앱 정보를 불러오지 못했습니다');
    await expect(generateMetadata(params())).rejects.toThrow('앱 정보를 불러오지 못했습니다');
    expect(notFound).not.toHaveBeenCalled();
    query.mockResolvedValue({ data: row, error: null });
    expect(renderToStaticMarkup(await AppDetailPage(params()))).toContain('Example');
    expect(await generateMetadata(params())).toMatchObject({
      title: 'Example - 1티어',
    });
  });
});

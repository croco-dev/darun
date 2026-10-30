import { renderToStaticMarkup } from 'react-dom/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { MemoCard } from './MemoCard';

const fixture = vi.hoisted(() => ({
  result: { data: null, error: null } as {
    data: { content: string } | null;
    error: { message: string } | null;
  },
}));
vi.mock('@/utils/supabase/server', () => ({
  createClient: () => ({
    from: () => ({
      select: () => ({
        eq: () => ({
          single: () => fixture.result,
          maybeSingle: () => fixture.result,
        }),
      }),
    }),
  }),
}));

describe('MemoCard', () => {
  beforeEach(() => {
    fixture.result = { data: null, error: null };
  });

  it('omits an absent memo and displays the saved memo as text', async () => {
    expect(await MemoCard({ appId: 'memo-app' })).toBeNull();
    fixture.result.data = {
      content: 'First line\n<script>not executable</script>',
    };
    const markup = renderToStaticMarkup(await MemoCard({ appId: 'memo-app' }));
    expect(markup).toContain('First line\n&lt;script&gt;not executable&lt;/script&gt;');
  });

  it('shows read failure separately from absence without exposing the raw error', async () => {
    fixture.result = {
      data: null,
      error: { message: 'private database diagnostics' },
    };
    const markup = renderToStaticMarkup(await MemoCard({ appId: 'memo-app' }));
    expect(markup).toContain('role="alert"');
    expect(markup).toContain('메모를 불러오지 못했습니다.');
    expect(markup).not.toContain('private database diagnostics');
  });
});

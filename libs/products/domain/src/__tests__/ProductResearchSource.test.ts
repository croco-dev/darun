import { describe, expect, it } from 'vitest';
import { isAnchorExcerptPresent, normalizeResearchSources } from '../services/ProductResearchSource';

describe('normalizeResearchSources', () => {
  it('dedupes canonical urls, caps sources, and marks input host matches exactly', () => {
    const sources = normalizeResearchSources(
      [
        { title: 'A', url: 'https://linear.app/', description: 'plan' },
        { title: 'A dup', url: 'https://linear.app/#top', description: 'plan' },
        { title: 'Evil', url: 'https://linear.app.evil.org/', description: 'phishing' },
        { title: 'Bad', url: 'ftp://linear.app/file', description: 'ignored' },
        { title: 'Docs', url: 'https://docs.linear.app/features', description: 'features' },
      ],
      'linear.app'
    );

    expect(sources.map(source => source.id)).toEqual(['s1', 's2', 's3']);
    expect(sources[0]).toMatchObject({ url: 'https://linear.app/', relationToInput: 'INPUT_HOST_MATCH' });
    expect(sources[1]).toMatchObject({
      url: 'https://linear.app.evil.org/',
      relationToInput: 'EXTERNAL',
    });
    expect(sources[2]).toMatchObject({
      url: 'https://docs.linear.app/features',
      relationToInput: 'INPUT_HOST_MATCH',
    });
  });

  it('preserves non-default ports and strips canonical ones', () => {
    const sources = normalizeResearchSources(
      [
        { title: 'Custom port', url: 'https://linear.app:8443/features', description: 'features on custom port' },
        { title: 'Default port', url: 'https://linear.app:443/features', description: 'canonical https' },
        { title: 'Distinct port host', url: 'https://linear.app/features', description: 'no port' },
      ],
      'linear.app'
    );

    expect(sources.map(source => source.url)).toEqual([
      'https://linear.app:8443/features',
      'https://linear.app/features',
    ]);
  });

  it('preserves ranked search order without promoting matching hostnames', () => {
    const sources = normalizeResearchSources(
      [
        { title: 'External', url: 'https://external.example/post', description: 'external facts' },
        { title: 'Official', url: 'https://linear.app/about', description: 'official facts' },
        { title: 'External 2', url: 'https://other.example/post', description: 'more facts' },
      ],
      'linear.app'
    );

    expect(sources.map(source => source.url)).toEqual([
      'https://external.example/post',
      'https://linear.app/about',
      'https://other.example/post',
    ]);
    expect(sources.map(source => source.id)).toEqual(['s1', 's2', 's3']);
  });
});

describe('isAnchorExcerptPresent', () => {
  it('accepts only excerpts copied from the cited source', () => {
    const [source] = normalizeResearchSources(
      [{ title: 'Linear', url: 'https://linear.app', description: 'Plan and track work' }],
      'linear.app'
    );
    if (!source) {
      throw new Error('expected one source');
    }

    expect(isAnchorExcerptPresent('track work', source)).toBe(true);
    expect(isAnchorExcerptPresent('free plan forever', source)).toBe(false);
    expect(isAnchorExcerptPresent('', source)).toBe(false);
  });
});

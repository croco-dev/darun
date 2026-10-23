import {
  projectProductDescriptionEvidence,
  safeEvidenceUrl,
  safeReaderFacingUrl,
  type ProductDescriptionEvidenceSources,
  type ProductDescriptionEvidence,
} from '@darun/products-domain';
import { describe, expect, it } from 'vitest';
import { createHash } from 'node:crypto';
import { createProductDescriptionResponseFormat } from '../prompts/productDescriptionSchema';
import { renderProductDescriptionDocument } from '../services/ProductDescriptionRenderer';
import { validateProductDescriptionDocument } from '../validators/productDescriptionDocumentValidator';

const sources: ProductDescriptionEvidenceSources = {
  product: {
    id: 'p',
    name: '메모',
    summary: '문서를 저장합니다.',
    description: '<p>원본</p>',
    categoryIds: [],
  },
  categories: [],
  features: [],
  tags: [],
  links: [],
  screenshots: [],
  flows: [],
  researchSources: [],
};
const evidence: ProductDescriptionEvidence = {
  productId: 'p',
  productName: '메모',
  items: [
    { id: 'product:summary', kind: 'product_summary', text: '문서 저장' },
    {
      id: 'link:a',
      kind: 'link',
      title: 'A',
      displayText: 'A',
      url: 'https://example.com/a',
    },
    {
      id: 'link:b',
      kind: 'link',
      title: 'B',
      displayText: 'B',
      url: 'https://example.com/b',
    },
  ],
};
const doc = {
  intro: { text: '문서를 저장합니다.', evidenceRefs: ['product:summary'] },
  sections: [],
  recommendedIf: [],
  limitations: [],
  closing: { text: '문서 저장 도구입니다.', evidenceRefs: ['product:summary'] },
};

describe('description integrity contracts', () => {
  it('requires all five backed-text properties, nullable closed links and shared bounds', () => {
    const schema = createProductDescriptionResponseFormat(evidence).json_schema.schema;
    for (const block of [
      schema.properties.intro,
      schema.properties.closing,
      schema.properties.sections.items.properties.paragraphs.items,
      schema.properties.recommendedIf.items,
    ]) {
      expect(block.required).toEqual(['text', 'evidenceRefs', 'bullets', 'quote', 'link']);
      expect(block.additionalProperties).toBe(false);
      expect(block.properties.link.type).toEqual(['object', 'null']);
      expect(block.properties.link.required).toEqual(['label', 'url']);
      expect(block.properties.link.additionalProperties).toBe(false);
      expect(block.properties.quote.enum).toEqual([false]);
      expect(block.properties.bullets.maxItems).toBe(4);
      expect(block.properties.bullets.items.maxLength).toBe(200);
    }
    expect(schema.properties.intro.properties.text.maxLength).toBe(600);
    expect(schema.properties.recommendedIf.items.properties.text.maxLength).toBe(300);
    expect(schema.properties.sections.items.properties.title.maxLength).toBe(150);
    expect(schema.properties.sections.items.additionalProperties).toBe(false);
    expect(schema.additionalProperties).toBe(false);
  });

  it('normalizes optional legacy fields and the explicit empty wire form identically', () => {
    const normalized = validateProductDescriptionDocument(doc, evidence);
    expect(normalized.intro).toEqual({
      ...doc.intro,
      bullets: [],
      quote: false,
      link: null,
    });
    const explicit = {
      ...doc,
      intro: { ...doc.intro, bullets: [], quote: false, link: null },
    };
    expect(validateProductDescriptionDocument(explicit, evidence)).toEqual(normalized);
  });

  it('rejects new quotes, unknown nested keys, and malformed links', () => {
    for (const intro of [
      { ...doc.intro, quote: true },
      { ...doc.intro, extra: 'unexpected' },
      { ...doc.intro, link: { url: 'https://example.com/a' } },
      {
        ...doc.intro,
        link: { label: 'A', url: 'https://example.com/a', extra: true },
      },
    ]) {
      expect(() => validateProductDescriptionDocument({ ...doc, intro }, evidence)).toThrow();
    }
    // Legacy rich documents are rendered, not fed through new-generation quote validation.
    expect(
      renderProductDescriptionDocument({
        ...doc,
        limitations: [],
        intro: { ...doc.intro, quote: true },
      })
    ).toContain('<blockquote>');
  });

  it('matches any cited URL, not only the first cited link', () => {
    const intro = {
      ...doc.intro,
      evidenceRefs: ['product:summary', 'link:a', 'link:b'],
      link: { label: 'B', url: 'https://example.com/b' },
    };
    expect(validateProductDescriptionDocument({ ...doc, intro }, evidence).intro.link?.url).toBe(
      'https://example.com/b'
    );
    expect(() =>
      validateProductDescriptionDocument(
        {
          ...doc,
          intro: { ...intro, evidenceRefs: ['product:summary', 'link:a'] },
        },
        evidence
      )
    ).toThrow();
  });

  it.each([
    'https://user:secret@example.com/a',
    'http://localhost/a',
    'http://localhost./a',
    'http://service.internal/a',
    'http://intranet/a',
    'http://127.0.0.1/a',
    'http://169.254.169.254/a',
    'http://10.1.2.3/a',
    'http://[::1]/a',
    'http://[::ffff:7f00:1]/a',
    'http://[fe80::1]/a',
    'javascript:alert(1)',
  ])('rejects unsafe reader-facing URL %s independently of original source storage', url => {
    expect(safeReaderFacingUrl(url)).toBeNull();
    if (url.startsWith('http')) expect(safeEvidenceUrl(url)).not.toBeNull();
  });

  it('hashes displayText in v2 while preserving the historical v1 format', () => {
    const link = {
      id: 'a',
      title: '제목',
      link: 'https://example.com/a',
      displayLink: '첫 문구',
    };
    const first = projectProductDescriptionEvidence({
      ...sources,
      links: [link],
    });
    const second = projectProductDescriptionEvidence({
      ...sources,
      links: [{ ...link, displayLink: '다른 문구' }],
    });
    expect(first.evidenceHashVersion).toBe('v2');
    expect(first.evidenceHash).not.toBe(second.evidenceHash);
    expect(first.legacyEvidenceHash).toBe(second.legacyEvidenceHash);
    const historicalJson = JSON.stringify({
      productId: 'p',
      productName: '메모',
      summary: '문서를 저장합니다.',
      categories: [],
      features: [],
      tags: [],
      links: [{ id: 'link:a', title: '제목', url: 'https://example.com/a' }],
      screenshots: [],
      flows: [],
      research: [],
    });
    expect(first.legacyEvidenceHash).toBe(createHash('sha256').update(historicalJson).digest('hex'));
    expect(first.baseDescriptionHash).toBe(second.baseDescriptionHash);
  });

  it('does not hash unselected rows beyond the existing quota', () => {
    const links = ['a', 'b', 'c', 'd'].map(id => ({
      id,
      title: id,
      link: `https://example.com/${id}`,
      displayLink: id,
    }));
    const first = projectProductDescriptionEvidence({ ...sources, links });
    const changed = links.map(link => (link.id === 'd' ? { ...link, displayLink: '미채택 변경' } : link));
    expect(projectProductDescriptionEvidence({ ...sources, links: changed }).evidenceHash).toBe(first.evidenceHash);
  });
});

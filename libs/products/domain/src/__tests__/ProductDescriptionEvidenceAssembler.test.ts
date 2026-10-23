import { describe, expect, it } from 'vitest';
import {
  projectProductDescriptionEvidence,
  type ProductDescriptionEvidenceSources,
} from '../services/ProductDescriptionEvidenceProjector';

const source: ProductDescriptionEvidenceSources = {
  product: {
    id: 'p',
    name: ' 메모 ',
    summary: '문서 저장',
    description: '<p>원본</p>',
    categoryIds: ['b', 'a'],
  },
  categories: [
    { id: 'b', labelKo: '', labelEn: 'Docs' },
    { id: 'a', labelKo: ' 기록 ', labelEn: 'Records' },
  ],
  features: [
    { id: 'z', name: ' 저장 ', summary: ' 오래 보관 ' },
    { id: 'f', name: '문서', summary: '' },
  ],
  tags: [' 문서 ', '기록'],
  links: [
    {
      id: 'l',
      title: '자료',
      link: 'https://example.com/guide',
      displayLink: '안내',
    },
  ],
  screenshots: [
    {
      id: 's',
      title: '화면',
      imageAlt: ' 문서 목록 ',
      platform: 'WEB',
      screenType: 'LIST',
      priority: 3,
    },
  ],
  flows: [
    {
      id: 'flow',
      title: ' 문서 저장 ',
      description: '입력한 문서를 저장',
      platform: 'WEB',
      steps: [{ caption: '입력' }, { caption: '저장' }],
    },
  ],
  researchSources: [
    {
      id: 'r',
      title: '자료',
      url: 'https://example.com/docs',
      hostname: 'example.com',
      snippet: '문서를 저장합니다.',
      extraSnippets: [],
    },
  ],
};

describe('pure description evidence projection', () => {
  it('normalizes and orders all eight kinds without mutating the source', () => {
    const result = projectProductDescriptionEvidence(source);
    expect(result.evidence.productName).toBe('메모');
    expect(result.evidence.items.map(item => item.kind)).toEqual([
      'product_summary',
      'category',
      'category',
      'feature',
      'feature',
      'tag',
      'tag',
      'link',
      'screenshot',
      'flow',
      'research',
    ]);
    expect(result.evidence.items.slice(1, 5)).toEqual([
      { id: 'category:a', kind: 'category', text: '기록' },
      { id: 'category:b', kind: 'category', text: 'Docs' },
      { id: 'feature:f', kind: 'feature', title: '문서' },
      { id: 'feature:z', kind: 'feature', title: '저장', text: '오래 보관' },
    ]);
    expect(source.features[0]?.id).toBe('z');
  });

  it.each(['product', 'category', 'feature', 'tag', 'link', 'screenshot', 'flow', 'research'] as const)(
    'hashes actual selected %s input',
    kind => {
      const changed: ProductDescriptionEvidenceSources = structuredClone(source);
      switch (kind) {
        case 'product':
          changed.product.name = '다른 이름';
          break;
        case 'category':
          changed.categories[0]!.labelEn = 'Different label';
          break;
        case 'feature':
          changed.features[0]!.summary = '다른 설명';
          break;
        case 'tag':
          changed.tags[0] = '새 태그';
          break;
        case 'link':
          changed.links[0]!.displayLink = '다른 문구';
          break;
        case 'screenshot':
          changed.screenshots[0]!.imageAlt = '새 캡션';
          break;
        case 'flow':
          changed.flows[0]!.steps[0]!.caption = '다른 단계';
          break;
        case 'research':
          changed.researchSources[0]!.snippet = '다른 스니펫';
          break;
      }
      const first = projectProductDescriptionEvidence(source);
      const second = projectProductDescriptionEvidence(changed);
      expect(first.evidenceHash).not.toBe(second.evidenceHash);
      expect(first.baseDescriptionHash).toBe(second.baseDescriptionHash);
    }
  );

  it('hashes the base description separately from evidence', () => {
    const first = projectProductDescriptionEvidence(source);
    const second = projectProductDescriptionEvidence({
      ...source,
      product: { ...source.product, description: '<p>사람 편집</p>' },
    });
    expect(first.evidenceHash).toBe(second.evidenceHash);
    expect(first.baseDescriptionHash).not.toBe(second.baseDescriptionHash);
  });

  it('accepts normal empty evidence and rejects unresolved category data', () => {
    const empty = {
      ...source,
      product: { ...source.product, categoryIds: [] },
      categories: [],
      features: [],
      tags: [],
      links: [],
      screenshots: [],
      flows: [],
      researchSources: [],
    };
    expect(projectProductDescriptionEvidence(empty).evidence.items).toHaveLength(1);
    expect(() =>
      projectProductDescriptionEvidence({
        ...source,
        categories: [null, source.categories[1]!],
      })
    ).toThrow('Category not found');
    expect(() =>
      projectProductDescriptionEvidence({
        ...source,
        categories: [{ id: 'b', labelKo: ' ', labelEn: '' }, source.categories[1]!],
      })
    ).toThrow('Category label is empty');
  });

  it('keeps the original quotas and deterministic screenshot priority', () => {
    const large: ProductDescriptionEvidenceSources = {
      ...source,
      tags: Array.from({ length: 10 }, (_, i) => `태그${i}`),
      links: Array.from({ length: 5 }, (_, i) => ({
        ...source.links[0]!,
        id: `l${i}`,
      })),
      screenshots: Array.from({ length: 5 }, (_, i) => ({
        ...source.screenshots[0]!,
        id: `s${i}`,
        priority: i,
      })),
      flows: Array.from({ length: 4 }, (_, i) => ({
        ...source.flows[0]!,
        id: `f${i}`,
        steps: Array.from({ length: 7 }, (_, j) => ({ caption: `단계${j}` })),
      })),
      researchSources: Array.from({ length: 5 }, (_, i) => ({
        ...source.researchSources[0]!,
        id: `r${i}`,
      })),
    };
    const items = projectProductDescriptionEvidence(large).evidence.items;
    expect(items.filter(item => item.kind === 'tag')).toHaveLength(8);
    expect(items.filter(item => item.kind === 'link')).toHaveLength(3);
    expect(items.filter(item => item.kind === 'screenshot').map(item => item.id)).toEqual([
      'screenshot:s4',
      'screenshot:s3',
      'screenshot:s2',
    ]);
    expect(items.filter(item => item.kind === 'research')).toHaveLength(3);
    const flows = items.filter(item => item.kind === 'flow');
    expect(flows).toHaveLength(2);
    for (const flow of flows) {
      if (flow.kind === 'flow') {
        expect(flow.stepCount).toBe(7);
        expect(flow.stepCaptions).toHaveLength(5);
      }
    }
  });
});

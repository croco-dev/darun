import { buildSchema, execute, isObjectType, validate } from 'graphql';
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import * as consumers from '../../../libs/__generated__/graphql';

const schema = buildSchema(readFileSync(new URL('../schema.graphql', import.meta.url), 'utf8'));
const operations = Object.entries(consumers).filter(([name]) => name.endsWith('Document'));

describe('stored SDL and generated consumer contracts', () => {
  it.each([
    'Product',
    'Link',
    'Company',
    'Magazine',
    'Author',
    'Feature',
    'FeatureScreenshot',
    'Category',
    'Tag',
    'Screenshot',
    'VisualFlow',
    'VisualFlowStep',
    'VisualScreenshot',
    'PageInfo',
    'ProductResearchJob',
    'ProductDescriptionJob',
    'TranslationJob',
  ])('exposes %s as the canonical public object name', name => {
    expect(isObjectType(schema.getType(name))).toBe(true);
  });

  it('includes the manual creation, publishing, and image signing consumers', () => {
    expect(operations.map(([name]) => name)).toEqual(
      expect.arrayContaining([
        'CreateProductOnNewProductFormDocument',
        'PublishProductOnPublishProductButtonDocument',
        'SignImageUploadDocument',
      ])
    );
  });

  it('omits magazine content from the admin list response and returns it to the editor', async () => {
    const magazine = {
      id: 'magazine-id',
      revision: 1,
      slug: 'sample-magazine',
      title: 'Sample magazine',
      summary: 'Sample summary',
      content: '<p>Magazine body</p>',
      backgroundImageUrl: '',
      updatedAt: new Date('2026-10-23T12:00:00Z'),
    };
    const list = await execute({
      schema,
      document: consumers.TempAllMagazinesOnMagazinesListDocument,
      variableValues: { page: 1 },
      rootValue: { tempAllMagazines: { totalCount: 1, totalPages: 1, magazines: [magazine] } },
    });
    const editor = await execute({
      schema,
      document: consumers.MagazineOnAdminEditorDocument,
      variableValues: { slug: magazine.slug },
      rootValue: { tempMagazineBySlug: magazine },
    });

    expect(list.errors).toBeUndefined();
    expect(list.data?.tempAllMagazines).toMatchObject({
      totalCount: 1,
      totalPages: 1,
      magazines: [{ id: magazine.id, summary: magazine.summary }],
    });
    expect(list.data?.tempAllMagazines).not.toHaveProperty(['magazines', '0', 'content']);
    expect(editor.errors).toBeUndefined();
    expect(editor.data?.tempMagazineBySlug).toMatchObject({ content: magazine.content });
  });

  it.each(operations)('validates %s including its object and fragment references', (_name, document) => {
    expect(validate(schema, document).map(error => error.toString())).toEqual([]);
  });
});

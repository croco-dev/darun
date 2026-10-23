import { buildSchema, isObjectType, validate } from 'graphql';
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

  it.each(operations)('validates %s including its object and fragment references', (_name, document) => {
    expect(validate(schema, document).map(error => error.toString())).toEqual([]);
  });
});

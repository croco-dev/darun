/* eslint-disable @typescript-eslint/no-explicit-any */
import 'reflect-metadata';

vi.mock('@darun/utils-apollo-server', () => ({
  AuthRole: { Admin: 'Admin' },
  Connection: class Connection {},
  ConnectionArgs: class ConnectionArgs {},
  Cursor: class Cursor {},
  PageInfo: class PageInfo {},
}));

vi.mock('typedi', () => ({
  Service: () => () => {},
}));

vi.mock('type-graphql', () => {
  const methodDecorator = () => (_t: any, _k: string, d: PropertyDescriptor) => d;
  return {
    Arg: () => () => vi.fn(),
    Args: () => methodDecorator,
    ArgsType: () => () => {},
    Authorized: methodDecorator,
    Field: () => () => {},
    FieldResolver: methodDecorator,
    GraphQLISODateTime: class GraphQLISODateTime {},
    ID: class ID {},
    InputType: () => () => {},
    Int: class Int {},
    Mutation: methodDecorator,
    ObjectType: () => () => {},
    Query: methodDecorator,
    Resolver: () => () => {},
    Root: () => () => {},
  };
});

import { describe, expect, it, vi } from 'vitest';
import { ProductQueryResolver } from '../Product.query.resolver';

describe('ProductQueryResolver', () => {
  describe('features', () => {
    it('should return all features even when some translations fail', async () => {
      const features = [
        { id: 'f1', name: 'Feature 1', summary: 'Summary 1', emoji: '🚀', productId: 'p1' },
        { id: 'f2', name: 'Feature 2', summary: 'Summary 2', emoji: '🔥', productId: 'p1' },
        { id: 'f3', name: 'Feature 3', summary: 'Summary 3', emoji: '💡', productId: 'p1' },
      ];

      const mockGetProductFeatures = {
        execute: vi.fn().mockResolvedValue(features),
      };

      let callCount = 0;
      const mockTranslationService = {
        getTranslation: vi.fn().mockImplementation(() => {
          callCount++;
          if (callCount === 3) {
            return Promise.reject(new Error('Translation service unavailable'));
          }
          return Promise.resolve(`translated-${callCount}`);
        }),
        getTranslations: vi.fn(),
      };

      const resolver = new ProductQueryResolver(
        undefined as any,
        undefined as any,
        undefined as any,
        undefined as any,
        undefined as any,
        undefined as any,
        undefined as any,
        undefined as any,
        undefined as any,
        mockGetProductFeatures as any,
        undefined as any,
        undefined as any,
        undefined as any,
        undefined as any,
        undefined as any,
        mockTranslationService as any
      );

      const result = await resolver.features({ id: 'p1', locale: 'en' } as any);

      expect(result).toHaveLength(3);
      expect(result[0].name).toBe('translated-1');
      expect(result[0].summary).toBe('translated-2');
      expect(result[1].name).toBe('Feature 2');
      expect(result[1].summary).toBe('translated-4');
      expect(result[2].name).toBe('translated-5');
      expect(result[2].summary).toBe('translated-6');
      expect(mockTranslationService.getTranslation).toHaveBeenCalledTimes(6);
    });

    it('should return other features when one feature processing fails entirely', async () => {
      const features = [
        { id: 'f1', name: 'Feature 1', summary: 'Summary 1', emoji: '🚀', productId: 'p1' },
        { id: 'f2', name: 'Feature 2', summary: 'Summary 2', emoji: '🔥', productId: 'p1' },
        { id: 'f3', name: 'Feature 3', summary: 'Summary 3', emoji: '💡', productId: 'p1' },
      ];

      const mockGetProductFeatures = {
        execute: vi.fn().mockResolvedValue(features),
      };

      let callCount = 0;
      const mockTranslationService = {
        getTranslation: vi.fn().mockImplementation(() => {
          callCount++;
          if (callCount === 3) {
            return Promise.reject(new Error('Network error'));
          }
          return Promise.resolve(`translated-${callCount}`);
        }),
        getTranslations: vi.fn(),
      };

      const resolver = new ProductQueryResolver(
        undefined as any,
        undefined as any,
        undefined as any,
        undefined as any,
        undefined as any,
        undefined as any,
        undefined as any,
        undefined as any,
        undefined as any,
        mockGetProductFeatures as any,
        undefined as any,
        undefined as any,
        undefined as any,
        undefined as any,
        undefined as any,
        mockTranslationService as any
      );

      const result = await resolver.features({ id: 'p1', locale: 'en' } as any);

      expect(result).toHaveLength(3);
      expect(result[0].name).toBe('translated-1');
      expect(result[1].name).toBe('Feature 2');
      expect(result[2].name).toBe('translated-5');
    });
  });

  describe('alternatives', () => {
    it('should return alternatives even when some lookups fail', async () => {
      const mockGetAlternativeProducts = {
        execute: vi
          .fn()
          .mockResolvedValue([
            { alternativeProductId: 'alt-1' },
            { alternativeProductId: 'alt-2' },
            { alternativeProductId: 'alt-3' },
          ]),
      };

      const mockGetPublishedProduct = {
        execute: vi
          .fn()
          .mockResolvedValueOnce({
            id: 'alt-1',
            name: 'Product 1',
            slug: 'product-1',
            summary: 'Summary 1',
            logoUrl: 'https://example.com/logo1.png',
          })
          .mockRejectedValueOnce(new Error('Database connection lost'))
          .mockResolvedValueOnce({
            id: 'alt-3',
            name: 'Product 3',
            slug: 'product-3',
            summary: 'Summary 3',
            logoUrl: 'https://example.com/logo3.png',
          }),
      };

      const mockTranslationService = {
        getTranslation: vi.fn(),
        getTranslations: vi.fn().mockResolvedValue(new Map()),
      };

      const resolver = new ProductQueryResolver(
        undefined as any,
        undefined as any,
        undefined as any,
        undefined as any,
        mockGetPublishedProduct as any,
        undefined as any,
        undefined as any,
        undefined as any,
        undefined as any,
        undefined as any,
        undefined as any,
        undefined as any,
        mockGetAlternativeProducts as any,
        undefined as any,
        undefined as any,
        mockTranslationService as any
      );

      const result = await resolver.alternatives({ id: 'p1', locale: 'en' } as any);

      expect(result).toHaveLength(2);
      expect(result[0].name).toBe('Product 1');
      expect(result[1].name).toBe('Product 3');
      expect(mockGetPublishedProduct.execute).toHaveBeenCalledTimes(3);
    });
  });
});

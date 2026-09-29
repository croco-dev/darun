import 'reflect-metadata';
import { describe, expect, it, vi } from 'vitest';
import { Product } from '../entities/Product';
import type { ProductRepository } from '../repositories/ProductRepository';
import { GetPublishedProductsForSitemap } from '../usecases/GetPublishedProductsForSitemap';

describe('GetPublishedProductsForSitemap', () => {
  it('fetches published products with cursor pagination', async () => {
    const mockProducts = [
      new Product({
        id: 'p3',
        name: 'Product 3',
        slug: 'p3',
        summary: 'Summary 3',
        logoUrl: 'https://example.com/logo3.png',
        publishedAt: new Date(),
      }),
      new Product({
        id: 'p2',
        name: 'Product 2',
        slug: 'p2',
        summary: 'Summary 2',
        logoUrl: 'https://example.com/logo2.png',
        publishedAt: new Date(),
      }),
      new Product({
        id: 'p1',
        name: 'Product 1',
        slug: 'p1',
        summary: 'Summary 1',
        logoUrl: 'https://example.com/logo1.png',
        publishedAt: new Date(),
      }),
    ];

    const mockRepo: Partial<ProductRepository> = {
      findPublishedByAfterIdAndLimit: vi.fn().mockResolvedValue(mockProducts),
    };

    const useCase = new GetPublishedProductsForSitemap(mockRepo as ProductRepository);
    const result = await useCase.execute({ limit: 2, cursor: 'p3' });

    // Over-fetches by one to detect whether another page exists.
    expect(mockRepo.findPublishedByAfterIdAndLimit).toHaveBeenCalledWith(3, 'p3');
    expect(result.products).toHaveLength(2);
    expect(result.nextCursor).toBe('p2');
  });

  it('sets nextCursor to undefined when the final page is exactly full', async () => {
    const mockProducts = [
      new Product({
        id: 'p2',
        name: 'Product 2',
        slug: 'p2',
        summary: 'Summary 2',
        logoUrl: 'https://example.com/logo2.png',
        publishedAt: new Date(),
      }),
      new Product({
        id: 'p1',
        name: 'Product 1',
        slug: 'p1',
        summary: 'Summary 1',
        logoUrl: 'https://example.com/logo1.png',
        publishedAt: new Date(),
      }),
    ];

    const mockRepo: Partial<ProductRepository> = {
      findPublishedByAfterIdAndLimit: vi.fn().mockResolvedValue(mockProducts),
    };

    const useCase = new GetPublishedProductsForSitemap(mockRepo as ProductRepository);
    const result = await useCase.execute({ limit: 2 });

    expect(result.products).toHaveLength(2);
    expect(result.nextCursor).toBeUndefined();
  });

  it('sets nextCursor to undefined when returned products count is less than limit', async () => {
    const mockProducts = [
      new Product({
        id: 'p1',
        name: 'Product 1',
        slug: 'p1',
        summary: 'Summary 1',
        logoUrl: 'https://example.com/logo1.png',
        publishedAt: new Date(),
      }),
    ];

    const mockRepo: Partial<ProductRepository> = {
      findPublishedByAfterIdAndLimit: vi.fn().mockResolvedValue(mockProducts),
    };

    const useCase = new GetPublishedProductsForSitemap(mockRepo as ProductRepository);
    const result = await useCase.execute({ limit: 5 });

    expect(result.products).toHaveLength(1);
    expect(result.nextCursor).toBeUndefined();
  });
});

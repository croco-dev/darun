import 'reflect-metadata';
import { describe, expect, it, vi } from 'vitest';
import { ProductFeature } from '../entities/ProductFeature';
import type { ProductFeatureRepository } from '../repositories/ProductFeatureRepository';
import { CreateProductFeature } from '../usecases/CreateProductFeature';
import { UpdateProductFeature } from '../usecases/UpdateProductFeature';

const name = '검색'.repeat(49) + '🔎찾';
const summary = '🚀'.repeat(253) + 'e\u0301';
const fields = { name, summary, emoji: '🔎', productId: 'product-id' };

function fixture() {
  const feature = new ProductFeature({ ...fields, id: 'feature-id' });
  const repository = {
    insert: vi.fn<ProductFeatureRepository['insert']>(async feature => feature),
    updateById: vi.fn<ProductFeatureRepository['updateById']>(async (_, modify) => modify(feature)),
    findOneById: vi.fn(),
    findManyByProductId: vi.fn(),
  } satisfies ProductFeatureRepository;
  const create = new CreateProductFeature(repository);
  const update = new UpdateProductFeature(repository);
  return { repository, create, update, feature };
}

describe('기능 이름·요약 저장 한도', () => {
  it('생성과 수정에서 한글과 보조 평면 문자를 포함한 최대 길이를 그대로 저장한다', async () => {
    const { create, update, repository, feature } = fixture();
    const created = await create.execute(fields);
    expect(created).toMatchObject({ name, summary });
    expect(repository.insert).toHaveBeenCalledOnce();
    feature.update({ name: '기존 이름', summary: '기존 요약' });
    expect(await update.execute({ featureId: feature.id, name, summary })).toMatchObject({ name, summary });
  });

  it.each([
    ['name', name + '가', 'product-feature/name-too-long'],
    ['summary', summary + '나', 'product-feature/summary-too-long'],
  ])('생성과 수정에서 %s 길이가 한도를 한 글자 초과하면 저장 전에 거절한다', async (field, value, code) => {
    const { create, update, repository, feature } = fixture();
    await expect(create.execute({ ...fields, [field]: value })).rejects.toMatchObject({ code });
    await expect(update.execute({ featureId: feature.id, [field]: value })).rejects.toMatchObject({ code });
    expect(repository.insert).not.toHaveBeenCalled();
    expect(repository.updateById).not.toHaveBeenCalled();
  });

  it('요약을 생략하면 유지하고 null 또는 빈 문자열을 명시하면 기존 값을 비운다', async () => {
    const { update, feature } = fixture();
    expect((await update.execute({ featureId: feature.id, emoji: '✅' })).summary).toBe(summary);
    expect((await update.execute({ featureId: feature.id, summary: null })).summary).toBeUndefined();
    await update.execute({ featureId: feature.id, summary: '다른 요약' });
    expect((await update.execute({ featureId: feature.id, summary: '' })).summary).toBe('');
  });
});

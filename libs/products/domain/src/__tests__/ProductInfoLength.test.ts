import { describe, expect, it, vi } from 'vitest';
import { Product } from '../entities/Product';
import { CreateProduct } from '../usecases/CreateProduct';
import { EditProduct } from '../usecases/EditProduct';
import { createMockRepository } from './productRepositoryMock';

const input = {
  name: '서비스',
  summary: '요약',
  slug: 'text-limit',
  logoUrl: 'https://example.com/logo.png',
};

describe('상품 이름·요약의 DB 문자 수 한도', () => {
  it.each(['name', 'summary'] as const)('%s 초과 입력은 생성·편집 저장소 호출 전에 거절한다', async field => {
    for (const character of ['a', '한', '😀']) {
      const repository = createMockRepository();
      vi.mocked(repository.insert).mockResolvedValue(new Product(input));
      const values = { ...input, [field]: character.repeat(256) };
      await expect(new CreateProduct(repository).execute(values)).rejects.toMatchObject({
        code: 'product/invalid-args',
      });
      await expect(
        new EditProduct(repository).execute({
          id: 'product-1',
          [field]: values[field],
        })
      ).rejects.toMatchObject({ code: 'product/invalid-args' });
      expect(repository.findOneBySlug).not.toHaveBeenCalled();
      expect(repository.insert).not.toHaveBeenCalled();
      expect(repository.updateById).not.toHaveBeenCalled();
    }
  });

  it.each(['a', '한', '😀'])('255개의 %s 문자는 잘라내지 않고 생성·편집한다', async character => {
    const repository = createMockRepository();
    const values = {
      ...input,
      name: character.repeat(255),
      summary: character.repeat(255),
    };
    vi.mocked(repository.insert).mockImplementation(async product => product);
    vi.mocked(repository.updateById).mockImplementation(async (_id, update) => update(new Product(input)));
    expect(await new CreateProduct(repository).execute(values)).toMatchObject(values);
    expect(
      await new EditProduct(repository).execute({
        id: 'product-1',
        name: values.name,
        summary: values.summary,
      })
    ).toMatchObject({ name: values.name, summary: values.summary });
  });

  it('편집에서 생략한 필드와 빈 요약은 그대로 허용한다', async () => {
    const repository = createMockRepository();
    vi.mocked(repository.updateById).mockImplementation(async (_id, update) => update(new Product(input)));
    expect(
      await new EditProduct(repository).execute({
        id: 'product-1',
        summary: '',
      })
    ).toMatchObject({ name: input.name, summary: '' });
  });
});

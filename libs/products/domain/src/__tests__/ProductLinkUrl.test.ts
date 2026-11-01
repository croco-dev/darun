import { describe, expect, it, vi } from 'vitest';
import { ProductLink } from '../entities/ProductLink';
import type { ProductLinkRepository } from '../repositories/ProductLinkRepository';
import { AddProductLink } from '../usecases/AddProductLink';
import { UpdateProductLink } from '../usecases/UpdateProductLink';

const values = {
  productId: 'product-1',
  title: '공식 사이트',
  link: 'https://example.com/path%2Fpart?q=%ED%95%9C%EA%B8%80&a=1&a=2#section',
  displayLink: 'example.com',
  iconUrl: 'https://example.com/icon.svg',
};

function repository(): ProductLinkRepository {
  return { insert: vi.fn(), updateById: vi.fn(), findManyByProductId: vi.fn() };
}

describe('상품 링크 URL 쓰기', () => {
  it.each(['http://', 'https://', 'ftp://example.com', 'javascript:alert(1)', '/relative', ''])(
    '잘못된 주소 %s는 저장소 호출 전에 거절한다',
    async link => {
      const repo = repository();
      await expect(new AddProductLink(repo).execute({ ...values, link })).rejects.toMatchObject({
        code: 'product/invalid-args',
      });
      await expect(
        new UpdateProductLink(repo).execute({
          linkId: 'link-1',
          productId: values.productId,
          link,
        })
      ).rejects.toMatchObject({ code: 'product/invalid-args' });
      expect(repo.insert).not.toHaveBeenCalled();
      expect(repo.updateById).not.toHaveBeenCalled();
    }
  );

  it('잘못된 주소로 entity를 수정하면 다른 필드와 기존 주소도 보존한다', () => {
    const entity = new ProductLink(values);
    expect(() => entity.update({ title: '변경 이름', link: 'https://' })).toThrow(
      expect.objectContaining({ code: 'product/invalid-args' })
    );
    expect(entity.title).toBe(values.title);
    expect(entity.link).toBe(values.link);
  });

  it.each([values.link, 'http://example.com:8080/a?x=hello%20world#끝', 'HTTPS://EXAMPLE.COM/Case'])(
    '정상 주소 %s의 원문을 그대로 저장한다',
    async link => {
      const repo = repository();
      await new AddProductLink(repo).execute({ ...values, link });
      expect(repo.insert).toHaveBeenCalledWith(expect.objectContaining({ link }));
      const entity = new ProductLink(values);
      vi.mocked(repo.updateById).mockImplementation(async (_id, _productId, modifier) => modifier(entity));
      await new UpdateProductLink(repo).execute({
        linkId: 'link-1',
        productId: values.productId,
        link,
      });
      expect(entity.link).toBe(link);
    }
  );

  it('기존 규칙 밖 주소를 읽고 주소를 생략한 다른 필드 수정도 허용한다', async () => {
    const entity = new ProductLink({ ...values, link: 'legacy-link' });
    const repo = repository();
    vi.mocked(repo.updateById).mockImplementation(async (_id, _productId, modifier) => modifier(entity));
    await new UpdateProductLink(repo).execute({
      linkId: 'link-1',
      productId: values.productId,
      title: '변경 이름',
    });
    expect(entity.title).toBe('변경 이름');
    expect(entity.link).toBe('legacy-link');
  });
});

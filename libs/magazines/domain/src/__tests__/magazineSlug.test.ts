import { describe, expect, it, vi } from 'vitest';
import { Magazine } from '../entities/Magazine';
import { MagazineError } from '../errors/magazineError';
import type { MagazineRepository } from '../repositories/MagazineRepository';
import { CreateMagazine } from '../usecases/CreateMagazine';
import { EditMagazine } from '../usecases/EditMagazine';

function fixture() {
  const saved = new Magazine({
    id: 'mag-1',
    slug: '기존-주소',
    title: '기존 제목',
    content: '기존 본문',
    backgroundImageUrl: '',
    authorId: 'author-1',
  });
  const insert = vi.fn(async (magazine: Magazine) => magazine);
  const updateById = vi.fn(async (_id: string, modifier: (magazine: Magazine) => Magazine) => modifier(saved));
  const repository = { insert, updateById } as unknown as MagazineRepository;
  return { saved, insert, updateById, create: new CreateMagazine(repository), edit: new EditMagazine(repository) };
}

describe('매거진의 상세 주소', () => {
  it.each(['', ' ', '.', '..', ' . ', '..\t'])('명시한 잘못된 slug %j는 쓰기 전에 거절한다', async slug => {
    const { create, edit, insert, updateById, saved } = fixture();
    await expect(
      create.execute({ title: '새 글', slug, backgroundImageUrl: '', authorId: 'author' })
    ).rejects.toMatchObject({ code: MagazineError.InvalidArgs });
    await expect(
      edit.execute({ id: saved.id, slug, title: '바뀌면 안 되는 제목', content: '바뀌면 안 되는 본문' })
    ).rejects.toMatchObject({ code: MagazineError.InvalidArgs });
    expect(insert).not.toHaveBeenCalled();
    expect(updateById).not.toHaveBeenCalled();
    expect(saved).toMatchObject({ slug: '기존-주소', title: '기존 제목', content: '기존 본문' });
  });

  it.each(['', '.', '..'])('자동 생성 결과 %j도 쓰기 전에 검사한다', async title => {
    const { create, insert } = fixture();
    await expect(create.execute({ title, backgroundImageUrl: '', authorId: 'author' })).rejects.toMatchObject({
      code: MagazineError.InvalidArgs,
    });
    expect(insert).not.toHaveBeenCalled();
  });

  it('입력하지 않은 slug는 기존 제목 규칙으로 생성한다', async () => {
    const { create } = fixture();
    const result = await create.execute({ title: 'Hello 새 소식', backgroundImageUrl: '', authorId: 'author' });
    expect(result.slug).toBe('hello-새-소식');
  });

  it.each(['한글-소식', 'release-2026', 'v1.2', '...', 'a/b?c#d', '%2e'])(
    '정상 slug %j를 변경하지 않는다',
    async slug => {
      const { create, edit } = fixture();
      const result = await create.execute({ title: '새 글', slug, backgroundImageUrl: '', authorId: 'author' });
      expect(result.slug).toBe(slug);
      const edited = await edit.execute({ id: 'mag-1', slug, content: '새 본문' });
      expect(edited).toMatchObject({ slug, content: '새 본문' });
      const href = `/ko/magazines/${encodeURIComponent(result.slug)}`;
      expect(decodeURIComponent(new URL(href, 'https://darun.io').pathname)).toBe(`/ko/magazines/${slug}`);
    }
  );

  it.each(['', '.', '..'])('기존의 잘못된 slug %j는 읽을 수 있지만 최종 주소를 고쳐야 수정할 수 있다', async slug => {
    const { saved, edit } = fixture();
    saved.slug = slug;
    expect(new Magazine({ ...saved }).slug).toBe(slug);
    await expect(edit.execute({ id: saved.id, content: '바뀌면 안 되는 본문' })).rejects.toMatchObject({
      code: MagazineError.InvalidArgs,
    });
    expect(saved).toMatchObject({ slug, content: '기존 본문' });
    expect(await edit.execute({ id: saved.id, slug: '고친-주소', content: '새 본문' })).toMatchObject({
      slug: '고친-주소',
      content: '새 본문',
    });
  });

  it('정상 주소는 생략한 수정에서도 유지한다', async () => {
    const { saved, edit } = fixture();
    expect(await edit.execute({ id: saved.id, content: '본문만 수정' })).toMatchObject({
      slug: '기존-주소',
      content: '본문만 수정',
    });
  });
});

import { describe, expect, it, vi } from 'vitest';
import type { ProductFlowRepository } from '../repositories/ProductFlowRepository';
import type { ProductScreenshotRepository } from '../repositories/ProductScreenshotRepository';
import { ToggleVisualFlowSave, ToggleVisualScreenshotSave } from '../usecases/ToggleVisualSave';
import { GetMyVisualSaves, GetVisualSaveStatus } from '../usecases/VisualSaveQuery';

const SCREENSHOT_ID = '01M4J60S333ZQJYAFX4RA6SBWM';
const FLOW_ID = '01M4J60S358KTV7R3SX2B8H9NS';
const USER_ID = '01M4J60S999ZQJYAFX4RA6SBWM';

function screenshotRepo(overrides: Record<string, unknown> = {}): ProductScreenshotRepository {
  return {
    findManyByProductIdSortByPriorityDesc: vi.fn().mockResolvedValue([]),
    findById: vi.fn().mockResolvedValue(null),
    insert: vi.fn(),
    deleteById: vi.fn(),
    deleteWithLock: vi.fn(),
    updateById: vi.fn(),
    findManyVisualPublishedByFilterAndAfterIdAndLimit: vi.fn().mockResolvedValue([]),
    findManyVisualPublishedByFilterAndPageAndLimit: vi.fn().mockResolvedValue([]),
    findVisualPublishedById: vi.fn().mockResolvedValue({ id: SCREENSHOT_ID }),
    countVisualPublishedByFilter: vi.fn().mockResolvedValue(0),
    insertVisualViewEvent: vi.fn().mockResolvedValue(true),
    toggleVisualSave: vi.fn().mockResolvedValue({ saved: true }),
    isVisualSaved: vi.fn().mockResolvedValue(false),
    findVisualSavesByUser: vi.fn().mockResolvedValue({ screenshotIds: [], flowIds: [], totalCount: 0 }),
    ...overrides,
  } as unknown as ProductScreenshotRepository;
}

function flowRepo(overrides: Record<string, unknown> = {}): ProductFlowRepository {
  return {
    findManyVisualPublishedByFilterAndAfterIdAndLimit: vi.fn().mockResolvedValue([]),
    findManyVisualPublishedByFilterAndPageAndLimit: vi.fn().mockResolvedValue([]),
    findVisualPublishedById: vi.fn().mockResolvedValue({ id: FLOW_ID }),
    countVisualPublishedByFilter: vi.fn().mockResolvedValue(0),
    findManyVisualPublishedByScreenshotId: vi.fn().mockResolvedValue([]),
    insertVisualViewEvent: vi.fn().mockResolvedValue(true),
    toggleVisualSave: vi.fn().mockResolvedValue({ saved: true }),
    isVisualSaved: vi.fn().mockResolvedValue(false),
    ...overrides,
  } as unknown as ProductFlowRepository;
}

describe('ToggleVisualSave (M3)', () => {
  it('화면 저장 토글이 저장 결과를 반환한다', async () => {
    const repo = screenshotRepo({ toggleVisualSave: vi.fn().mockResolvedValue({ saved: true }) });
    const useCase = new ToggleVisualScreenshotSave(repo);
    const result = await useCase.execute({ id: SCREENSHOT_ID, userId: USER_ID });
    expect(result).toEqual({ saved: true });
    expect(repo.toggleVisualSave).toHaveBeenCalledWith({ screenshotId: SCREENSHOT_ID, userId: USER_ID });
  });

  it('이미 저장된 화면이면 saved:false를 반환한다', async () => {
    const repo = screenshotRepo({ toggleVisualSave: vi.fn().mockResolvedValue({ saved: false }) });
    const useCase = new ToggleVisualScreenshotSave(repo);
    const result = await useCase.execute({ id: SCREENSHOT_ID, userId: USER_ID });
    expect(result).toEqual({ saved: false });
  });

  it('존재하지 않는 화면이면 productNotFound 상당 에러를 던진다', async () => {
    const repo = screenshotRepo({ findVisualPublishedById: vi.fn().mockResolvedValue(null) });
    const useCase = new ToggleVisualScreenshotSave(repo);
    await expect(useCase.execute({ id: SCREENSHOT_ID, userId: USER_ID })).rejects.toThrow();
  });

  it('잘못된 ID 형식이면 invalid-args 에러를 던진다', async () => {
    const useCase = new ToggleVisualScreenshotSave(screenshotRepo());
    await expect(useCase.execute({ id: 'bad-id', userId: USER_ID })).rejects.toThrow();
  });

  it('플로 저장 토글이 저장 결과를 반환한다', async () => {
    const repo = flowRepo({ toggleVisualSave: vi.fn().mockResolvedValue({ saved: true }) });
    const useCase = new ToggleVisualFlowSave(repo);
    const result = await useCase.execute({ id: FLOW_ID, userId: USER_ID });
    expect(result).toEqual({ saved: true });
    expect(repo.toggleVisualSave).toHaveBeenCalledWith({ flowId: FLOW_ID, userId: USER_ID });
  });

  it('존재하지 않는 플로면 에러를 던진다', async () => {
    const repo = flowRepo({ findVisualPublishedById: vi.fn().mockResolvedValue(null) });
    const useCase = new ToggleVisualFlowSave(repo);
    await expect(useCase.execute({ id: FLOW_ID, userId: USER_ID })).rejects.toThrow();
  });
});

describe('VisualSaveQuery (M3)', () => {
  it('저장 여부를 조회한다', async () => {
    const sRepo = screenshotRepo({ isVisualSaved: vi.fn().mockResolvedValue(true) });
    const fRepo = flowRepo({ isVisualSaved: vi.fn().mockResolvedValue(false) });
    const useCase = new GetVisualSaveStatus(sRepo, fRepo);
    await expect(useCase.screenshot({ id: SCREENSHOT_ID, userId: USER_ID })).resolves.toEqual({ saved: true });
    await expect(useCase.flow({ id: FLOW_ID, userId: USER_ID })).resolves.toEqual({ saved: false });
  });

  it('내 저장 목록을 LATEST 정렬(offset 기반)로 조회한다', async () => {
    const sRepo = screenshotRepo({
      findVisualSavesByUser: vi
        .fn()
        .mockResolvedValue({ screenshotIds: [SCREENSHOT_ID], flowIds: [], totalCount: 1 }),
    });
    const useCase = new GetMyVisualSaves(sRepo);
    const result = await useCase.execute({ userId: USER_ID, kind: 'screenshot', first: 24, page: 1 });
    expect(result).toEqual({ ids: [SCREENSHOT_ID], totalCount: 1 });
    expect(sRepo.findVisualSavesByUser).toHaveBeenCalledWith({
      userId: USER_ID,
      kind: 'screenshot',
      limit: 24,
      offset: 24,
    });
  });

  it('first 상한(48)을 초과하면 잘라낸다', async () => {
    const sRepo = screenshotRepo();
    const useCase = new GetMyVisualSaves(sRepo);
    await useCase.execute({ userId: USER_ID, kind: 'flow', first: 100, page: 0 });
    expect(sRepo.findVisualSavesByUser).toHaveBeenCalledWith({
      userId: USER_ID,
      kind: 'flow',
      limit: 48,
      offset: 0,
    });
  });
});

import { describe, expect, it, vi } from 'vitest';
import type { ProductFlowRepository } from '../repositories/ProductFlowRepository';
import type { ProductScreenshotRepository } from '../repositories/ProductScreenshotRepository';
import { TrackVisualFlowView } from '../usecases/TrackVisualFlowView';
import { TrackVisualScreenshotView } from '../usecases/TrackVisualScreenshotView';

const SCREENSHOT_ID = '01M4J60S333ZQJYAFX4RA6SBWM';
const FLOW_ID = '01M4J60S358KTV7R3SX2B8H9NS';

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
    ...overrides,
  } as unknown as ProductFlowRepository;
}

describe('TrackVisualScreenshotView (M2)', () => {
  it('신규 조회면 tracked: true를 반환한다', async () => {
    const repo = screenshotRepo();
    const useCase = new TrackVisualScreenshotView(repo);
    const result = await useCase.execute({ id: SCREENSHOT_ID, viewerIp: '1.2.3.4' });
    expect(result).toEqual({ tracked: true });
    expect(repo.insertVisualViewEvent).toHaveBeenCalled();
  });

  it('24시간 내 중복이면 tracked: false를 반환한다', async () => {
    const repo = screenshotRepo({ insertVisualViewEvent: vi.fn().mockResolvedValue(false) });
    const useCase = new TrackVisualScreenshotView(repo);
    const result = await useCase.execute({ id: SCREENSHOT_ID, viewerIp: '1.2.3.4' });
    expect(result).toEqual({ tracked: false });
  });

  it('존재하지 않는 화면이면 productNotFound 상당 에러를 던진다', async () => {
    const repo = screenshotRepo({ findVisualPublishedById: vi.fn().mockResolvedValue(null) });
    const useCase = new TrackVisualScreenshotView(repo);
    await expect(useCase.execute({ id: SCREENSHOT_ID, viewerIp: '1.2.3.4' })).rejects.toThrow();
  });

  it('잘못된 ID 형식이면 invalid-args 에러를 던진다', async () => {
    const useCase = new TrackVisualScreenshotView(screenshotRepo());
    await expect(useCase.execute({ id: 'bad-id', viewerIp: '1.2.3.4' })).rejects.toThrow();
  });

  it('viewer 해시는 IP 원문이 아니다(64자 hex)', async () => {
    process.env.VISUAL_VIEW_IP_SALT = 'test-salt';
    const repo = screenshotRepo();
    const useCase = new TrackVisualScreenshotView(repo);
    await useCase.execute({ id: SCREENSHOT_ID, viewerIp: '9.9.9.9' });
    const hash = (repo.insertVisualViewEvent as ReturnType<typeof vi.fn>).mock.calls[0][0].viewerHash as string;
    expect(hash).toMatch(/^[0-9a-f]{64}$/);
    expect(hash).not.toContain('9.9.9.9');
  });
});

describe('TrackVisualFlowView (M2)', () => {
  it('신규 조회면 tracked: true를 반환한다', async () => {
    const repo = flowRepo();
    const useCase = new TrackVisualFlowView(repo);
    const result = await useCase.execute({ id: FLOW_ID, viewerIp: '5.6.7.8' });
    expect(result).toEqual({ tracked: true });
  });

  it('24시간 내 중복이면 tracked: false를 반환한다', async () => {
    const repo = flowRepo({ insertVisualViewEvent: vi.fn().mockResolvedValue(false) });
    const useCase = new TrackVisualFlowView(repo);
    const result = await useCase.execute({ id: FLOW_ID, viewerIp: '5.6.7.8' });
    expect(result).toEqual({ tracked: false });
  });

  it('존재하지 않는 플로면 에러를 던진다', async () => {
    const repo = flowRepo({ findVisualPublishedById: vi.fn().mockResolvedValue(null) });
    const useCase = new TrackVisualFlowView(repo);
    await expect(useCase.execute({ id: FLOW_ID, viewerIp: '5.6.7.8' })).rejects.toThrow();
  });
});

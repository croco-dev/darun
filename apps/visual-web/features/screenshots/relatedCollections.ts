import type { ScreenshotDetailRelatedFlow, ScreenshotDetailRelatedScreenshot } from './useScreenshotDetail';

type SiblingEdge = {
  node?: { id?: string | null; imageUrl?: string | null; imageAlt?: string | null; title?: string | null } | null;
} | null;

type DetailFlow = {
  id?: string | null;
  title?: string | null;
  stepCount?: number | null;
  coverScreenshot?: { imageUrl?: string | null; imageAlt?: string | null } | null;
} | null;

export function filterSiblingScreenshots(
  edges: readonly SiblingEdge[],
  selfId: string,
  size: number
): ScreenshotDetailRelatedScreenshot[] {
  const filtered = edges.flatMap(edge => {
    const node = edge?.node;
    if (!node?.id || node.id === selfId || !node.imageUrl) {
      return [];
    }
    return [
      {
        id: node.id,
        imageUrl: node.imageUrl,
        imageAlt: node.imageAlt ?? '',
        title: node.title ?? null,
      },
    ];
  });
  return filtered.slice(0, size);
}

export function siblingDisplayTotalCount(totalCount: number): number {
  return Math.max(0, totalCount - 1);
}

export function normalizeDetailFlows(flows: readonly DetailFlow[]): ScreenshotDetailRelatedFlow[] {
  return flows.flatMap(flow => {
    if (!flow?.id || !flow.coverScreenshot?.imageUrl) {
      return [];
    }
    return [
      {
        id: flow.id,
        title: flow.title ?? '',
        stepCount: flow.stepCount ?? 0,
        coverImageUrl: flow.coverScreenshot.imageUrl,
        coverImageAlt: flow.coverScreenshot.imageAlt ?? '',
      },
    ];
  });
}

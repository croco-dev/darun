import type { FlowDetailRelatedFlow } from './useFlowDetail';

type SiblingEdge = {
  node?: {
    id?: string | null;
    title?: string | null;
    stepCount?: number | null;
    coverScreenshot?: { imageUrl?: string | null; imageAlt?: string | null } | null;
  } | null;
} | null;

export function filterSiblingFlows(
  edges: readonly SiblingEdge[],
  selfId: string,
  size: number
): FlowDetailRelatedFlow[] {
  const filtered = edges.flatMap(edge => {
    const node = edge?.node;
    if (!node?.id || node.id === selfId || !node.coverScreenshot?.imageUrl) {
      return [];
    }
    return [
      {
        id: node.id,
        title: node.title ?? '',
        stepCount: node.stepCount ?? 0,
        coverImageUrl: node.coverScreenshot.imageUrl,
        coverImageAlt: node.coverScreenshot.imageAlt ?? '',
      },
    ];
  });
  return filtered.slice(0, size);
}

export function siblingFlowDisplayTotalCount(totalCount: number): number {
  return Math.max(0, totalCount - 1);
}

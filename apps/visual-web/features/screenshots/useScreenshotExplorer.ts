'use client';

import { VisualScreenshotsOnExplorerDocument, type VisualScreenshotsOnExplorerQuery } from '@darun/provider-graphql';
import type { VisualPlatform, VisualScreenType } from '@darun/provider-graphql';
import {
  readExplorerProductParam,
  readExplorerQueryParam,
  useExplorerQuery,
  type ExplorerBaseState,
  type ExplorerFilters,
} from '../explorer/useExplorerQuery';
import { isVisualPlatformValue, isVisualScreenTypeValue } from '../explorer/visualTaxonomy';
import { VISUAL_SCREENSHOTS_PAGE_SIZE } from './documents';

export type ScreenshotCard = {
  id: string;
  imageUrl: string;
  imageAlt: string;
  title: string | null;
  platform: VisualPlatform | null;
  screenType: VisualScreenType | null;
  product: { id: string; name: string; slug: string; logoUrl: string; summary: string };
};

export type ScreenshotExplorerState = ExplorerBaseState<ScreenshotCard> & {
  screenType: string | null;
  onScreenTypeChange: (value: string) => void;
};

type ScreenshotNode = NonNullable<
  NonNullable<VisualScreenshotsOnExplorerQuery['visualScreenshots']['edges'][number]['node']>
>;

function readFilterParams(searchParams: URLSearchParams): ExplorerFilters {
  const screenTypeParam = searchParams.get('screenType');
  return {
    query: readExplorerQueryParam(searchParams),
    platform: isVisualPlatformValue(searchParams.get('platform')) ? (searchParams.get('platform') as string) : null,
    secondary: isVisualScreenTypeValue(screenTypeParam) ? screenTypeParam : null,
    product: readExplorerProductParam(searchParams),
  };
}

export function mapEdgeToCard(node: ScreenshotNode): ScreenshotCard | null {
  const productNode = node.product;
  if (!productNode) {
    return null;
  }
  return {
    id: node.id ?? '',
    imageUrl: node.imageUrl ?? '',
    imageAlt: node.imageAlt ?? '',
    title: node.title ?? null,
    platform: node.platform ?? null,
    screenType: node.screenType ?? null,
    product: {
      id: productNode.id ?? '',
      name: productNode.name ?? '',
      slug: productNode.slug ?? '',
      logoUrl: productNode.logoUrl ?? '',
      summary: productNode.summary ?? '',
    },
  };
}

const SCREENSHOT_OPTIONS = {
  document: VisualScreenshotsOnExplorerDocument,
  connectionKey: 'visualScreenshots',
  pageSize: VISUAL_SCREENSHOTS_PAGE_SIZE,
  basePath: '/',
  secondaryParamKey: 'screenType',
  clearFiltersTo: '/',
  readFilters: readFilterParams,
  buildVariables: (filters: ExplorerFilters) => ({
    query: filters.query,
    platform: filters.platform,
    screenType: filters.secondary,
    productSlug: filters.product,
  }),
  mapEdgeToCard,
  getEdges: (data: unknown) => (data as VisualScreenshotsOnExplorerQuery | undefined)?.visualScreenshots?.edges,
  getConnection: (data: unknown) => (data as VisualScreenshotsOnExplorerQuery | undefined)?.visualScreenshots,
  getNodeId: (node: ScreenshotNode) => node.id,
  refetchLabel: 'Failed to refetch screenshots',
  loadMoreLabel: 'Failed to load more screenshots',
} as const;

export function useScreenshotExplorer(): ScreenshotExplorerState {
  const state = useExplorerQuery(SCREENSHOT_OPTIONS);
  return {
    ...state,
    screenType: state.secondary,
    onScreenTypeChange: state.onSecondaryChange,
  };
}

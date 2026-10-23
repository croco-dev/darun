'use client';

import {
  VisualScreenshotsOnExplorerDocument,
  type VisualScreenshotsOnExplorerQuery,
  type VisualUiElement,
} from '@darun/provider-graphql';
import type { VisualPlatform, VisualScreenType } from '@darun/provider-graphql';
import {
  readExplorerProductParam,
  readExplorerQueryParam,
  useExplorerQuery,
  type ExplorerBaseState,
  type ExplorerFilters,
  type ExplorerSearchDraft,
} from '../explorer/useExplorerQuery';
import { isVisualPlatformValue, isVisualScreenTypeValue, isVisualUiElementValue } from '../explorer/visualTaxonomy';
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
  element: VisualUiElement | null;
  onScreenTypeChange: (value: string) => void;
  onElementChange: (value: string) => void;
};

type ScreenshotNode = NonNullable<
  NonNullable<VisualScreenshotsOnExplorerQuery['visualScreenshots']['edges'][number]['node']>
>;

function readFilterParams(searchParams: URLSearchParams): ExplorerFilters {
  const screenTypeParam = searchParams.get('screenType');
  const elementParam = searchParams.get('element');
  return {
    query: readExplorerQueryParam(searchParams),
    platform: isVisualPlatformValue(searchParams.get('platform')) ? (searchParams.get('platform') as string) : null,
    secondary: isVisualScreenTypeValue(screenTypeParam) ? screenTypeParam : null,
    product: readExplorerProductParam(searchParams),
    element: isVisualUiElementValue(elementParam) ? elementParam : null,
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
  boundedPagination: true,
  basePath: '/',
  secondaryParamKey: 'screenType',
  clearFiltersTo: '/',
  readFilters: readFilterParams,
  buildVariables: (filters: ExplorerFilters) => ({
    query: filters.query,
    platform: filters.platform,
    screenType: filters.secondary,
    uiElements: filters.element != null ? [filters.element] : null,
    productSlug: filters.product,
  }),
  mapEdgeToCard,
  getEdges: (data: unknown) => (data as VisualScreenshotsOnExplorerQuery | undefined)?.visualScreenshots?.edges,
  getConnection: (data: unknown) => (data as VisualScreenshotsOnExplorerQuery | undefined)?.visualScreenshots,
  getNodeId: (node: ScreenshotNode) => node.id,
  refetchLabel: 'Failed to refetch screenshots',
  loadMoreLabel: 'Failed to load more screenshots',
} as const;

export function useScreenshotExplorer(searchDraft?: ExplorerSearchDraft): ScreenshotExplorerState {
  const state = useExplorerQuery(SCREENSHOT_OPTIONS, searchDraft);
  return {
    ...state,
    screenType: state.secondary,
    element: (state.element ?? null) as VisualUiElement | null,
    onScreenTypeChange: state.onSecondaryChange,
    onElementChange: state.onElementChange ?? (() => {}),
  };
}

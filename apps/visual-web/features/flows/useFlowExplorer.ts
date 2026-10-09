'use client';

import { VisualFlowsOnExplorerDocument, type VisualFlowsOnExplorerQuery } from '@darun/provider-graphql';
import type { VisualFlowType, VisualPlatform } from '@darun/provider-graphql';
import {
  readExplorerProductParam,
  readExplorerQueryParam,
  useExplorerQuery,
  type ExplorerBaseState,
  type ExplorerFilters,
} from '../explorer/useExplorerQuery';
import {
  isVisualFlowTypeValue,
  isVisualPlatformValue,
  resolveVisualFlowType,
  resolveVisualPlatform,
} from '../explorer/visualTaxonomy';
import { VISUAL_FLOWS_PAGE_SIZE } from './explorerDocuments';

export type FlowCard = {
  id: string;
  title: string;
  description: string;
  platform: VisualPlatform;
  flowType: VisualFlowType;
  stepCount: number;
  coverImageUrl: string;
  coverImageAlt: string;
  product: { id: string; name: string; slug: string; logoUrl: string };
};

export type FlowExplorerState = ExplorerBaseState<FlowCard> & {
  flowType: string | null;
  onFlowTypeChange: (value: string) => void;
};

type FlowNode = NonNullable<NonNullable<VisualFlowsOnExplorerQuery['visualFlows']['edges'][number]['node']>>;

function readFilterParams(searchParams: URLSearchParams): ExplorerFilters {
  const rawPlatform = searchParams.get('platform');
  const rawFlowType = searchParams.get('flowType');
  return {
    query: readExplorerQueryParam(searchParams),
    platform: rawPlatform !== null && isVisualPlatformValue(rawPlatform) ? rawPlatform : null,
    secondary: rawFlowType !== null && isVisualFlowTypeValue(rawFlowType) ? rawFlowType : null,
    product: readExplorerProductParam(searchParams),
  };
}

function mapEdgeToCard(node: FlowNode): FlowCard | null {
  const cover = node.coverScreenshot;
  const productNode = node.product;
  if (!cover || !productNode) {
    return null;
  }
  return {
    id: node.id ?? '',
    title: node.title ?? '',
    description: node.description ?? '',
    platform: resolveVisualPlatform(node.platform),
    flowType: resolveVisualFlowType(node.flowType),
    stepCount: node.stepCount ?? 0,
    coverImageUrl: cover.imageUrl ?? '',
    coverImageAlt: cover.imageAlt ?? '',
    product: {
      id: productNode.id ?? '',
      name: productNode.name ?? '',
      slug: productNode.slug ?? '',
      logoUrl: productNode.logoUrl ?? '',
    },
  };
}

const FLOW_OPTIONS = {
  document: VisualFlowsOnExplorerDocument,
  connectionKey: 'visualFlows',
  pageSize: VISUAL_FLOWS_PAGE_SIZE,
  basePath: '/flows',
  secondaryParamKey: 'flowType',
  clearFiltersTo: '/flows',
  readFilters: readFilterParams,
  buildVariables: (filters: ExplorerFilters) => ({
    query: filters.query,
    platform: filters.platform,
    flowType: filters.secondary,
    productSlug: filters.product,
  }),
  mapEdgeToCard,
  getEdges: (data: unknown) => (data as VisualFlowsOnExplorerQuery | undefined)?.visualFlows?.edges,
  getConnection: (data: unknown) => (data as VisualFlowsOnExplorerQuery | undefined)?.visualFlows,
  getNodeId: (node: FlowNode) => node.id,
  refetchLabel: 'Failed to refetch flows',
  loadMoreLabel: 'Failed to load more flows',
} as const;

export function useFlowExplorer(): FlowExplorerState {
  const state = useExplorerQuery(FLOW_OPTIONS);
  return {
    ...state,
    flowType: state.secondary,
    onFlowTypeChange: state.onSecondaryChange,
  };
}

import { registerEnumType } from 'type-graphql';

export enum VisualSortGraph {
  LATEST = 'LATEST',
  POPULAR = 'POPULAR',
}

registerEnumType(VisualSortGraph, {
  name: 'VisualSort',
  description: 'Visual 목록 정렬. LATEST는 keyset, POPULAR는 오프셋(page) 방식.',
});

import { PageInfo } from '@darun/utils-apollo-server';
import { Field, Int, ObjectType } from 'type-graphql';
import { VisualFlow } from './VisualFlow';

@ObjectType()
export class VisualFlowConnection {
  @Field(() => Int)
  totalCount: number;

  @Field(() => PageInfo)
  pageInfo: PageInfo;

  @Field(() => [VisualFlowEdge])
  edges: VisualFlowEdge[];
}

@ObjectType()
export class VisualFlowEdge {
  @Field()
  cursor: string;

  @Field(() => VisualFlow)
  node: VisualFlow;
}

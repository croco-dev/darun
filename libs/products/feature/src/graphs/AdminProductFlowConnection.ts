import { PageInfo } from '@darun/utils-apollo-server';
import { Field, ID, Int, ObjectType } from 'type-graphql';
import { Screenshot } from './Screenshot';
import { VisualFlowTypeGraph } from './VisualFlowType';
import { VisualPlatformGraph } from './VisualPlatform';

@ObjectType('AdminProductFlowSummary')
export class AdminProductFlowSummary {
  @Field(() => ID)
  id: string;

  @Field(() => String)
  title: string;

  @Field(() => VisualPlatformGraph)
  platform: string;

  @Field(() => VisualFlowTypeGraph)
  flowType: string;

  @Field(() => Int)
  stepCount: number;

  @Field(() => Screenshot, { nullable: true })
  coverScreenshot: Screenshot | null;
}

@ObjectType('AdminProductFlowEdge')
export class AdminProductFlowEdge {
  @Field(() => String)
  cursor: string;

  @Field(() => AdminProductFlowSummary)
  node: AdminProductFlowSummary;
}

@ObjectType('AdminProductFlowConnection')
export class AdminProductFlowConnection {
  @Field(() => [AdminProductFlowEdge])
  edges: AdminProductFlowEdge[];

  @Field(() => PageInfo)
  pageInfo: PageInfo;
}

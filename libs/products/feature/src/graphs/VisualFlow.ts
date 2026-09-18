import { Field, ID, Int, ObjectType } from 'type-graphql';
import { Product } from './Product';
import { Screenshot } from './Screenshot';
import { VisualFlowStep } from './VisualFlowStep';
import { VisualFlowTypeGraph } from './VisualFlowType';
import { VisualPlatformGraph } from './VisualPlatform';

@ObjectType({ description: '공개 제품에 속한 UX 플로' })
export class VisualFlow {
  @Field(() => ID)
  id: string;

  @Field(() => String)
  title: string;

  @Field(() => String)
  description: string;

  @Field(() => VisualPlatformGraph)
  platform: string;

  @Field(() => VisualFlowTypeGraph)
  flowType: string;

  @Field(() => Product)
  product: Product;

  @Field(() => Screenshot)
  coverScreenshot: Screenshot;

  @Field(() => Int)
  stepCount: number;

  @Field(() => [VisualFlowStep])
  steps: VisualFlowStep[];
}

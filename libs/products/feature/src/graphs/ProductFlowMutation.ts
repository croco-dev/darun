import { Field, ID, InputType, ObjectType } from 'type-graphql';
import { VisualFlow } from './VisualFlow';
import { VisualFlowStep } from './VisualFlowStep';
import { VisualFlowTypeGraph } from './VisualFlowType';
import { VisualPlatformGraph } from './VisualPlatform';

@InputType()
export class ProductFlowStepInput {
  @Field(() => ID)
  screenshotId: string;

  @Field(() => String)
  caption: string;
}

@InputType()
export class CreateProductFlowInput {
  @Field(() => String)
  productSlug: string;

  @Field(() => String)
  title: string;

  @Field(() => String)
  description: string;

  @Field(() => VisualPlatformGraph)
  platform: string;

  @Field(() => VisualFlowTypeGraph)
  flowType: string;

  @Field(() => [ProductFlowStepInput])
  steps: ProductFlowStepInput[];
}

@ObjectType()
export class CreateProductFlowPayload {
  @Field(() => VisualFlow)
  flow: VisualFlow;
}

@InputType()
export class UpdateProductFlowInput {
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

  @Field(() => [ProductFlowStepInput])
  steps: ProductFlowStepInput[];
}

@ObjectType()
export class UpdateProductFlowPayload {
  @Field(() => VisualFlow)
  flow: VisualFlow;
}

@InputType()
export class DeleteProductFlowInput {
  @Field(() => ID)
  id: string;
}

@ObjectType()
export class DeleteProductFlowPayload {
  @Field()
  success: boolean;
}

export type VisualFlowGraph = VisualFlow;
export type { VisualFlowStep };

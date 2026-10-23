import { Field, ID, InputType, ObjectType } from 'type-graphql';
import { VisualFlow } from './VisualFlow';
import { VisualFlowStep } from './VisualFlowStep';
import { VisualFlowTypeGraph } from './VisualFlowType';
import { VisualPlatformGraph } from './VisualPlatform';

@InputType('ProductFlowStepInput')
export class ProductFlowStepInput {
  @Field(() => ID)
  screenshotId: string;

  @Field(() => String)
  caption: string;
}

@InputType('CreateProductFlowInput')
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

@ObjectType('CreateProductFlowPayload')
export class CreateProductFlowPayload {
  @Field(() => VisualFlow)
  flow: VisualFlow;
}

@InputType('UpdateProductFlowInput')
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

@ObjectType('UpdateProductFlowPayload')
export class UpdateProductFlowPayload {
  @Field(() => VisualFlow)
  flow: VisualFlow;
}

@InputType('DeleteProductFlowInput')
export class DeleteProductFlowInput {
  @Field(() => ID)
  id: string;
}

@ObjectType('DeleteProductFlowPayload')
export class DeleteProductFlowPayload {
  @Field()
  success: boolean;
}

export type VisualFlowGraph = VisualFlow;
export type { VisualFlowStep };

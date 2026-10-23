import { Field, InputType, ObjectType } from 'type-graphql';
import { Feature } from './Feature';

@ObjectType('CreateProductFeaturePayload')
export class CreateProductFeaturePayload {
  @Field(() => Feature)
  feature: Feature;
}

@InputType('CreateProductFeatureInput')
export class CreateProductFeatureInput {
  @Field()
  productSlug: string;

  @Field()
  name: string;

  @Field()
  emoji: string;

  @Field()
  summary: string;
}

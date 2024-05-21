import { Field, InputType, ObjectType } from 'type-graphql';
import { Feature } from './Feature';

@ObjectType()
export class CreateProductFeaturePayload {
  @Field(() => Feature)
  feature: Feature;
}

@InputType()
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

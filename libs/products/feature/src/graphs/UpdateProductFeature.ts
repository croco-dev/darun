import { Field, InputType, ObjectType } from 'type-graphql';
import { Feature } from './Feature';

@ObjectType('UpdateProductFeaturePayload')
export class UpdateProductFeaturePayload {
  @Field(() => Feature)
  feature: Feature;
}

@InputType('UpdateProductFeatureInput')
export class UpdateProductFeatureInput {
  @Field({ nullable: true })
  name?: string;

  @Field({ nullable: true })
  emoji?: string;

  @Field({ nullable: true })
  summary?: string;
}

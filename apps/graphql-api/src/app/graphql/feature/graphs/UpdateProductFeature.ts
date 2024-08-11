import { Field, InputType, ObjectType } from 'type-graphql';
import { Feature } from './Feature';

@ObjectType()
export class UpdateProductFeaturePayload {
  @Field(() => Feature)
  feature: Feature;
}

@InputType()
export class UpdateProductFeatureInput {
  @Field({ nullable: true })
  name?: string;

  @Field({ nullable: true })
  emoji?: string;

  @Field({ nullable: true })
  summary?: string;
}

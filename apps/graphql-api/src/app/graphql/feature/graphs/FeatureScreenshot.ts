import { Field, ID, ObjectType } from 'type-graphql';

@ObjectType()
export class FeatureScreenshot {
  @Field(() => ID)
  id: string;

  @Field(() => String)
  imageUrl: string;

  @Field(() => String)
  imageAlt: string;
}

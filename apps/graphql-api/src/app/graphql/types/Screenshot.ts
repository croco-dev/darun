import { Field, ID, ObjectType } from 'type-graphql';

@ObjectType()
export class Screenshot {
  @Field(() => ID)
  id: string;

  @Field(() => String)
  imageUrl: string;

  @Field(() => String)
  imageAlt: string;
}

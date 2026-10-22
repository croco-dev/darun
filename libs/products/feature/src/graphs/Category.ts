import { Field, ID, ObjectType } from 'type-graphql';

@ObjectType('Category')
export class Category {
  @Field(() => ID)
  id: string;

  @Field(() => String)
  slug: string;

  @Field(() => String)
  labelKo: string;

  @Field(() => String)
  labelEn: string;
}

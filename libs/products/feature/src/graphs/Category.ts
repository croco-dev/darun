import { Field, ID, ObjectType } from "type-graphql";

@ObjectType()
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

import { Field, ID, ObjectType } from 'type-graphql';

@ObjectType()
export class Product {
  @Field(() => ID)
  id: string;

  @Field(() => String)
  name: string;

  @Field(() => String)
  slug: string;

  @Field(() => String)
  summary: string;

  @Field(() => String, { nullable: true })
  description: string | null;

  @Field(() => String)
  logoUrl: string;
}
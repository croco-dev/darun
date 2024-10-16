import { Field, GraphQLISODateTime, ID, ObjectType } from 'type-graphql';

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
  description?: string;

  @Field(() => String)
  logoUrl: string;

  @Field(() => String, { nullable: true })
  ownedCompanyId?: string;

  @Field(() => GraphQLISODateTime, { nullable: true })
  updatedAt?: Date;

  @Field(() => GraphQLISODateTime, { nullable: true })
  publishedAt?: Date;
}

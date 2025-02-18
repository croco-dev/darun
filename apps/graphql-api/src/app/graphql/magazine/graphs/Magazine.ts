import { Field, GraphQLISODateTime, ID, ObjectType } from 'type-graphql';

@ObjectType()
export class Magazine {
  @Field(() => ID)
  id: string;

  @Field(() => String)
  slug: string;

  @Field(() => String)
  title: string;

  @Field(() => String)
  authorId: string;

  @Field(() => String, { nullable: true })
  description?: string;

  @Field(() => String)
  backgroundImageUrl: string;

  @Field(() => GraphQLISODateTime, { nullable: true })
  updatedAt?: Date;

  @Field(() => GraphQLISODateTime, { nullable: true })
  publishedAt?: Date;
}

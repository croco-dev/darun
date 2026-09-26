import { Field, GraphQLISODateTime, ID, ObjectType } from 'type-graphql';

@ObjectType()
export class ProductDescriptionJob {
  @Field(() => ID)
  id: string;

  @Field(() => String)
  productId: string;

  @Field(() => String)
  status: string;

  @Field(() => String, { nullable: true })
  message?: string;

  @Field(() => String, { nullable: true })
  error?: string;

  @Field(() => String, { nullable: true })
  evidenceHash?: string;

  @Field(() => String, { nullable: true })
  baseDescriptionHash?: string;

  @Field(() => String, { nullable: true })
  candidateHtml?: string;

  @Field(() => GraphQLISODateTime, { nullable: true })
  appliedAt?: Date;

  @Field(() => GraphQLISODateTime, { nullable: true })
  createdAt?: Date;

  @Field(() => GraphQLISODateTime, { nullable: true })
  updatedAt?: Date;
}

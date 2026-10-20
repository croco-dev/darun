import { Field, GraphQLISODateTime, ID, ObjectType } from 'type-graphql';

@ObjectType('ProductDescriptionJob')
export class ProductDescriptionJob {
  @Field(() => ID)
  id: string;

  @Field(() => String)
  productId: string;

  @Field(() => String, { description: '후보가 소속된 Product의 현재 slug. 관리자 후보 재진입 주소에 사용한다.' })
  productSlug?: string;

  @Field(() => String)
  status: string;

  @Field(() => String, { nullable: true })
  dispatchStatus?: string;

  @Field(() => GraphQLISODateTime, { nullable: true })
  runNotBefore?: Date;

  @Field(() => GraphQLISODateTime, { nullable: true })
  nextDispatchAt?: Date;

  @Field(() => String, { nullable: true })
  retryOfJobId?: string;

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

  @Field(() => String, { nullable: true })
  writerModel?: string;

  @Field(() => String, { nullable: true })
  reviewerModel?: string;

  @Field(() => GraphQLISODateTime, { nullable: true })
  appliedAt?: Date;

  @Field(() => GraphQLISODateTime, { nullable: true })
  createdAt?: Date;

  @Field(() => GraphQLISODateTime, { nullable: true })
  updatedAt?: Date;
}

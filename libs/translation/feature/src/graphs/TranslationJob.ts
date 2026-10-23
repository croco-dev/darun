import { Field, GraphQLISODateTime, ID, ObjectType } from 'type-graphql';

@ObjectType('TranslationJob')
export class TranslationJob {
  @Field(() => ID)
  id: string;

  @Field(() => String)
  entityType: string;

  @Field(() => String)
  entityId: string;

  @Field(() => [String], { nullable: true })
  fields?: string[];

  @Field(() => String)
  locale: string;

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
  model?: string;

  @Field(() => String, { nullable: true })
  message?: string;

  @Field(() => String, { nullable: true })
  error?: string;

  @Field(() => GraphQLISODateTime, { nullable: true })
  createdAt?: Date;

  @Field(() => GraphQLISODateTime, { nullable: true })
  updatedAt?: Date;
}

import { Field, ID, ObjectType } from 'type-graphql';

@ObjectType()
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
  message?: string;

  @Field(() => String, { nullable: true })
  error?: string;
}

import { Field, ObjectType } from 'type-graphql';

@ObjectType()
export class TranslationJob {
  @Field(() => String)
  entityType: string;

  @Field(() => String)
  entityId: string;

  @Field(() => [String])
  fields: string[];

  @Field(() => String)
  locale: string;

  @Field(() => String)
  status: string;

  @Field(() => String, { nullable: true })
  message?: string;
}

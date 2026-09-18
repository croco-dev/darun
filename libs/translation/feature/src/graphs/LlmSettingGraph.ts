import { Field, ID, ObjectType } from 'type-graphql';

@ObjectType('LlmSetting')
export class LlmSettingGraph {
  @Field(() => ID)
  id: string;

  @Field()
  endpoint: string;

  @Field(() => String, { nullable: true })
  apiKeyMasked?: string | null;

  @Field()
  model: string;

  @Field(() => String, { nullable: true })
  thinkingLevel?: string | null;

  @Field()
  updatedAt: Date;
}

import { Field, InputType } from 'type-graphql';

@InputType('SetVisualSaveInput')
export class SetVisualSaveInput {
  @Field(() => String)
  id: string;

  @Field(() => Boolean)
  saved: boolean;
}

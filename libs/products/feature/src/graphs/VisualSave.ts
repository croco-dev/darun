import { Field, ObjectType } from 'type-graphql';

@ObjectType()
export class ToggleVisualSavePayload {
  @Field(() => Boolean)
  saved: boolean;
}

@ObjectType()
export class VisualSaveStatusPayload {
  @Field(() => Boolean)
  saved: boolean;
}

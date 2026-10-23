import { Field, ObjectType } from 'type-graphql';

@ObjectType('ToggleVisualSavePayload')
export class ToggleVisualSavePayload {
  @Field(() => Boolean)
  saved: boolean;
}

@ObjectType('VisualSaveStatusPayload')
export class VisualSaveStatusPayload {
  @Field(() => Boolean)
  saved: boolean;
}

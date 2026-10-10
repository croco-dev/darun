import { Field, ObjectType } from 'type-graphql';

@ObjectType()
export class TrackVisualViewPayload {
  @Field(() => Boolean)
  tracked: boolean;
}

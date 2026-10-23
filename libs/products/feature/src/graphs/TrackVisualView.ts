import { Field, ObjectType } from 'type-graphql';

@ObjectType('TrackVisualViewPayload')
export class TrackVisualViewPayload {
  @Field(() => Boolean)
  tracked: boolean;
}

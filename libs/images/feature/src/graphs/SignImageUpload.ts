import { Field, InputType, ObjectType } from 'type-graphql';

@ObjectType()
export class SignImageUploadPayload {
  @Field()
  timestamp: number;

  @Field()
  signature: string;

  @Field()
  folder: string;
}

@InputType()
export class SignImageUploadInput {
  @Field()
  folder: string;

  @Field()
  displayName: string;
}

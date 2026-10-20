import { Field, InputType, ObjectType } from 'type-graphql';

@ObjectType('SignImageUploadPayload')
export class SignImageUploadPayload {
  @Field()
  timestamp: number;

  @Field()
  signature: string;

  @Field()
  folder: string;
}

@InputType('SignImageUploadInput')
export class SignImageUploadInput {
  @Field()
  folder: string;

  @Field()
  displayName: string;
}

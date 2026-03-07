import { Field, InputType, ObjectType } from 'type-graphql';

@ObjectType()
export class IndexProductPayload {
  @Field()
  indexed: boolean;
}

@InputType()
export class IndexProductInput {
  @Field()
  slug: string;
}

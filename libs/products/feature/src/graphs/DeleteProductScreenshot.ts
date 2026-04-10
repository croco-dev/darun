import { Field, ObjectType } from 'type-graphql';

@ObjectType()
export class DeleteProductScreenshotPayload {
  @Field()
  success: boolean;
}

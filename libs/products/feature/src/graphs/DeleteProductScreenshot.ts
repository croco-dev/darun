import { Field, ObjectType } from 'type-graphql';

@ObjectType('DeleteProductScreenshotPayload')
export class DeleteProductScreenshotPayload {
  @Field()
  success: boolean;
}

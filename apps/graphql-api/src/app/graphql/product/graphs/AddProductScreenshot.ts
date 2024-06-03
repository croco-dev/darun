import { Field, InputType, ObjectType } from 'type-graphql';
import { Product } from './Product';

@ObjectType()
export class AddProductScreenshotPayload {
  @Field(() => Product, { nullable: true })
  product: Product | null;
}

@InputType()
export class AddProductScreenshotInput {
  @Field()
  imageUrl: string;

  @Field()
  imageAlt: string;
}

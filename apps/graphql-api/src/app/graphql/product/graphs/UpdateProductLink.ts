import { Field, InputType, ObjectType } from 'type-graphql';
import { Product } from './Product';

@ObjectType()
export class UpdateProductLinkPayload {
  @Field(() => Product, { nullable: true })
  product: Product | null;
}

@InputType()
export class UpdateProductLinkInput {
  @Field({ nullable: true })
  title?: string;

  @Field({ nullable: true })
  link?: string;

  @Field({ nullable: true })
  displayLink?: string;

  @Field({ nullable: true })
  iconUrl?: string;
}

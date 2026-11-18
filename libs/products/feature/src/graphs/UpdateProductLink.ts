import { Field, InputType, ObjectType } from 'type-graphql';
import { Product } from './Product';
import { ProductLinkRole } from './ProductLinkRole';

@ObjectType('UpdateProductLinkPayload')
export class UpdateProductLinkPayload {
  @Field(() => Product, { nullable: true })
  product: Product | null;
}

@InputType('UpdateProductLinkInput')
export class UpdateProductLinkInput {
  @Field({ nullable: true })
  title?: string;

  @Field({ nullable: true })
  link?: string;

  @Field({ nullable: true })
  displayLink?: string;

  @Field({ nullable: true })
  iconUrl?: string;

  @Field(() => ProductLinkRole, { nullable: true })
  role?: ProductLinkRole | null;

  @Field(() => Boolean, { nullable: true })
  makePrimary?: boolean | null;
}

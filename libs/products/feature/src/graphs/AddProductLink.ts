import { Field, InputType, ObjectType } from 'type-graphql';
import { Product } from './Product';
import { ProductLinkRole } from './ProductLinkRole';

@ObjectType('AddProductLinkPayload')
export class AddProductLinkPayload {
  @Field(() => Product, { nullable: true })
  product: Product | null;
}

@InputType('AddProductLinkInput')
export class AddProductLinkInput {
  @Field()
  title: string;

  @Field()
  link: string;

  @Field()
  displayLink: string;

  @Field()
  iconUrl: string;

  @Field(() => ProductLinkRole, { nullable: true })
  role?: ProductLinkRole | null;
}

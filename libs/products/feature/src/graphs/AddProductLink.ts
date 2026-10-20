import { Field, InputType, ObjectType } from 'type-graphql';
import { Product } from './Product';

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
}

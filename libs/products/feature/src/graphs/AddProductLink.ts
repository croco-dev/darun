import { Field, InputType, ObjectType } from 'type-graphql';
import { Product } from './Product';

@ObjectType()
export class AddProductLinkPayload {
  @Field(() => Product, { nullable: true })
  product: Product | null;
}

@InputType()
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

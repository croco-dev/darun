import { Field, ID, ObjectType } from 'type-graphql';

@ObjectType()
export class ProductDescriptionJob {
  @Field(() => ID)
  id: string;

  @Field(() => String)
  productId: string;

  @Field(() => String)
  status: string;

  @Field(() => String, { nullable: true })
  message?: string;

  @Field(() => String, { nullable: true })
  error?: string;
}

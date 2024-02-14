require('reflect-metadata');
import { Field, ID, ObjectType } from 'type-graphql';

@ObjectType()
export class Product {
  @Field(() => ID)
  id: string;

  @Field(() => String)
  name: string;

  @Field(() => String, { nullable: true })
  description: string;

  @Field(() => String, { nullable: true })
  logoUrl: string;
}

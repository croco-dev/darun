import { Field, ID, ObjectType } from 'type-graphql';

@ObjectType()
export class Link {
  @Field(() => ID)
  id: string;

  @Field(() => String)
  title: string;

  @Field(() => String)
  iconUrl: string;

  @Field(() => String)
  link: string;

  @Field(() => String)
  displayLink: string;

  @Field(() => Boolean)
  isPrimary: boolean;
}

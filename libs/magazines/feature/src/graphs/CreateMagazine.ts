import { Field, InputType, ObjectType } from 'type-graphql';
import { Magazine } from './Magazine';

@ObjectType()
export class CreateMagazinePayload {
  @Field(() => Magazine)
  magazine: Magazine;
}

@InputType()
export class CreateMagazineInput {
  @Field()
  title: string;

  @Field()
  backgroundImageUrl: string;

  @Field({ nullable: true })
  logoImageUrl?: string;

  @Field({ nullable: true })
  slug?: string;

  @Field({ nullable: true })
  summary?: string;
}

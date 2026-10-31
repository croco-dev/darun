import { Field, Int, InputType, ObjectType } from 'type-graphql';
import { Magazine } from './Magazine';

@ObjectType('EditMagazinePayload')
export class EditMagazinePayload {
  @Field(() => Magazine)
  magazine: Magazine;
}

@InputType('EditMagazineInput')
export class EditMagazineInput {
  @Field(() => Int)
  expectedRevision: number;

  @Field({ nullable: true })
  slug?: string;

  @Field({ nullable: true })
  title?: string;

  @Field({ nullable: true })
  backgroundImageUrl?: string;

  @Field({ nullable: true })
  logoImageUrl?: string;

  @Field({ nullable: true })
  summary?: string;

  @Field({ nullable: true })
  content?: string;
}

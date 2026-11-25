import { Field, ObjectType } from 'type-graphql';
import { TranslationJob } from './TranslationJob';

@ObjectType('TranslationJobPage')
export class TranslationJobPage {
  @Field(() => [TranslationJob])
  jobs: TranslationJob[];

  @Field(() => String, { nullable: true })
  nextCursor?: string;
}

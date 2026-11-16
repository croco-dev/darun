import { PageInfo } from '@darun/utils-apollo-server';
import { Field, ObjectType } from 'type-graphql';
import { Magazine } from './Magazine';

@ObjectType('PublishedMagazineEdge')
export class PublishedMagazineEdge {
  @Field(() => String)
  cursor: string;

  @Field(() => Magazine)
  node: Magazine;
}

@ObjectType('PublishedMagazineConnection')
export class PublishedMagazineConnection {
  @Field(() => [PublishedMagazineEdge])
  edges: PublishedMagazineEdge[];

  @Field(() => PageInfo)
  pageInfo: PageInfo;
}

import { Resolver } from 'type-graphql';
import { Service } from 'typedi';
import { Magazine } from './graphs/Magazine';

@Resolver(() => Magazine)
@Service()
export class MagazineQueryResolver {
  constructor() {}
}

import { Query, Resolver } from 'type-graphql';
import { Service } from 'typedi';

@Resolver()
@Service()
export class HelloResolver {
  @Query(() => String)
  hello() {
    return 'Hello World!';
  }
}

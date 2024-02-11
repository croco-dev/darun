import { Query, Resolver } from 'type-graphql';
import { Service } from 'typedi';

@Resolver()
@Service()
export class HealthResolver {
  @Query(() => String)
  hello() {
    return 'Hello World!';
  }
}

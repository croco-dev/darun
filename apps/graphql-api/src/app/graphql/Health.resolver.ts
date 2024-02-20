import { AuthRole } from '@darun/utils-apollo-server';
import { Authorized, Query, Resolver } from 'type-graphql';
import { Service } from 'typedi';

@Resolver()
@Service()
export class HealthResolver {
  @Authorized([AuthRole.Admin])
  @Query(() => String)
  hello() {
    return 'Hello World!';
  }
}

import type { AuthChecker } from 'type-graphql';
import type { GraphQLContext } from '../GraphQLContext';

export const createAuthChecker = (): AuthChecker<GraphQLContext> => {
  return async (resolverData, roles) => {
    const userRoles = await resolverData.context.getRoles();

    return userRoles.some(userRole => roles.includes(userRole));
  };
};

import '../config';

import { NonEmptyArray } from 'type-graphql';
import { HealthResolver } from './graphql/Health.resolver';
import { ProductResolver } from './graphql/Product.resolver';

// eslint-disable-next-line @typescript-eslint/ban-types
export const resolvers: NonEmptyArray<Function> = [HealthResolver, ProductResolver];

import '../config';

import { NonEmptyArray } from 'type-graphql';
import { HelloResolver } from './HelloResolver';
import { ProductResolver } from './product/ProductResolver';

// eslint-disable-next-line @typescript-eslint/ban-types
export const resolvers: NonEmptyArray<Function> = [HelloResolver, ProductResolver];

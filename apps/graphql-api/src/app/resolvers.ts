import { NonEmptyArray } from 'type-graphql';
import { HelloResolver } from './HelloResolver';

// eslint-disable-next-line @typescript-eslint/ban-types
export const resolvers: NonEmptyArray<Function> = [HelloResolver];

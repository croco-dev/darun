import { ProductLinkRole } from '@darun/products-domain';
import { registerEnumType } from 'type-graphql';

registerEnumType(ProductLinkRole, { name: 'ProductLinkRole' });

export { ProductLinkRole };

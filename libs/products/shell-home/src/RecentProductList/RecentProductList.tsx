import { bind } from '@croco/utils-structure-react';
import { useRecentProductList } from './useRecentProductList';

export const RecentProductList = bind(useRecentProductList, () => <div>hello</div>);

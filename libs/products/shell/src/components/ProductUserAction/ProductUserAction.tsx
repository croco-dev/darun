'use client';

import { bind } from '@croco/utils-structure-react';
import { Button } from '@darun/ui';
import { Heart } from 'lucide-react';
import { useProductUserAction } from './useProductUserAction';

export const ProductUserAction = bind(useProductUserAction, ({ voteCount, upvoteProduct }) => (
  <div className="flex gap-1">
    <Button variant="shadow" onClick={upvoteProduct}>
      <div className="flex flex-col items-center justify-center gap-1 px-0.5 py-0.5">
        <Heart size={18} color={'#555'} fill={'#555'} />
        <span className="break-keep text-sm font-medium text-dark-700">{voteCount}</span>
      </div>
    </Button>
  </div>
));

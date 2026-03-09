'use client';

import { bind } from '@croco/utils-structure-react';
import { Button } from '@darun/ui';
import { useProductTagsForm } from './useProductTagsForm';

export const ProductTagsForm = bind(useProductTagsForm, ({ tags, updateTags, applyTags }) => (
  <div className="flex flex-row gap-2">
    <input
      className="min-w-0 flex-1 rounded-xl border border-black/10 px-3 py-2 text-sm text-dark-900 outline-none transition focus:border-dark-900"
      value={tags.join(', ')}
      onChange={event =>
        updateTags(
          event.target.value
            .split(',')
            .map(tag => tag.trim())
            .filter(Boolean)
        )
      }
      placeholder="태그를 쉼표로 구분해 입력하세요."
    />
    <Button onClick={applyTags} variant="contained" color="secondary">
      저장
    </Button>
  </div>
));

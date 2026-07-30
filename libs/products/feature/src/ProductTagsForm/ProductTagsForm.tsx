'use client';

import { Button } from '@darun/ui';
import { AdminInput } from '@darun/ui-admin';
import { bind } from '@darun/utils-structure-react';
import { useProductTagsForm } from './useProductTagsForm';

export const ProductTagsForm = bind(useProductTagsForm, ({ tags, updateTags, applyTags }) => (
  <div className="flex flex-row gap-2">
    <AdminInput
      className="min-w-0 flex-1"
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
    <Button onClick={applyTags} variant="contained" color="primary">
      저장
    </Button>
  </div>
));

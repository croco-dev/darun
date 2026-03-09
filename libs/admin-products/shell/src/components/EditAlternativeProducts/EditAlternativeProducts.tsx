import { bind } from '@croco/utils-structure-react';
import { Button } from '@darun/ui';
import { useEditAlternativeProducts } from './useEditAlternativeProducts';

export const EditAlternativeProducts = bind(useEditAlternativeProducts, ({ form, submit, selectData, updateQuery }) => (
  <form onSubmit={form.onSubmit(submit)}>
    <div className="flex flex-col gap-2">
      <label className="flex flex-col gap-1 text-sm font-medium text-dark-900">
        <span>서비스 검색</span>
        <input
          type="text"
          className="w-full rounded-xl border border-black/10 px-3 py-2 text-sm text-dark-900 outline-none transition focus:border-dark-900"
          placeholder="ex) 토스"
          onChange={updateQuery}
        />
      </label>
      <label className="flex flex-col gap-1 text-sm font-medium text-dark-900">
        <span>다른 서비스 (alternatives)</span>
        <select
          multiple
          className="w-full rounded-xl border border-black/10 px-3 py-2 text-sm text-dark-900 outline-none transition focus:border-dark-900"
          key={form.key('alternativeIds')}
          {...form.getInputProps('alternativeIds')}
        >
          {selectData.flatMap(group =>
            group.items.map(option => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))
          )}
        </select>
      </label>
    </div>

    <div className="mt-4 flex justify-end">
      <Button type="submit" variant="contained" color="secondary">
        저장
      </Button>
    </div>
  </form>
));

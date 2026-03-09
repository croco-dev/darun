import { bind } from '@croco/utils-structure-react';
import { Button } from '@darun/ui';
import data from '@emoji-mart/data';
import Picker from '@emoji-mart/react';
import { useEditProductFeatureItem } from './useEditProductFeatureItem';

export const EditProductFeatureItem = bind(useEditProductFeatureItem, ({ form, submit, loading }) => {
  return (
    <form onSubmit={form.onSubmit(submit)}>
      <div className="flex flex-col gap-2">
        <label className="flex flex-col gap-1 text-sm font-medium text-dark-900">
          <span>이모지</span>
          <div className="relative">
            <input
              className="w-full rounded-xl border border-black/10 px-3 py-2 pr-16 text-sm text-dark-900 outline-none transition focus:border-dark-900"
              placeholder="이모지 선택은 우측 버튼으로도 가능 ->"
              key={form.key('emoji')}
              {...form.getInputProps('emoji')}
            />
            <details className="absolute right-2 top-1/2 -translate-y-1/2">
              <summary className="list-none">
                <Button type="button" variant="contained" color="secondary" size="sm">
                  👆
                </Button>
              </summary>
              <div className="absolute right-0 top-full z-10 mt-2 overflow-hidden rounded-xl border border-black/10 bg-white shadow-lg">
                <Picker
                  data={data}
                  onEmojiSelect={({ native }: { native: string }) => form.setValues({ emoji: native })}
                />
              </div>
            </details>
          </div>
        </label>
        <label className="flex flex-col gap-1 text-sm font-medium text-dark-900">
          <span>기능 이름 (name)</span>
          <textarea
            className="min-h-20 rounded-xl border border-black/10 px-3 py-2 text-sm text-dark-900 outline-none transition focus:border-dark-900"
            placeholder="ex) 송금"
            rows={2}
            key={form.key('name')}
            {...form.getInputProps('name')}
          />
        </label>
        <label className="flex flex-col gap-1 text-sm font-medium text-dark-900">
          <span>요약 (summary)</span>
          <textarea
            className="min-h-20 rounded-xl border border-black/10 px-3 py-2 text-sm text-dark-900 outline-none transition focus:border-dark-900"
            placeholder="ex) (앱 이름)은 사용자를 우선하는 송금 경험을 제공합니다. ..."
            rows={2}
            key={form.key('summary')}
            {...form.getInputProps('summary')}
          />
        </label>
      </div>

      <div className="mt-4 flex justify-end">
        <Button type="submit" variant="contained" color="secondary" disabled={loading}>
          저장
        </Button>
      </div>
    </form>
  );
});

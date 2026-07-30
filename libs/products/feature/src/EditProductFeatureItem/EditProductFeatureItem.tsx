import { Button } from '@darun/ui';
import { AdminField, AdminInput, AdminTextarea, AdminActions } from '@darun/ui-admin';
import { bind } from '@darun/utils-structure-react';
import data from '@emoji-mart/data';
import Picker from '@emoji-mart/react';
import { useEditProductFeatureItem } from './useEditProductFeatureItem';

export const EditProductFeatureItem = bind(useEditProductFeatureItem, ({ form, submit, loading }) => {
  return (
    <form onSubmit={form.onSubmit(submit)}>
      <div className="flex flex-col gap-2">
        <AdminField label="이모지">
          <div className="relative">
            <AdminInput
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
              <div className="absolute right-0 top-full z-10 mt-2 overflow-hidden rounded-xl border border-dark-200 bg-white shadow-lg">
                <Picker
                  data={data}
                  onEmojiSelect={({ native }: { native: string }) => form.setValues({ emoji: native })}
                />
              </div>
            </details>
          </div>
        </AdminField>
        <AdminField label="기능 이름 (name)">
          <AdminTextarea placeholder="ex) 송금" rows={2} key={form.key('name')} {...form.getInputProps('name')} />
        </AdminField>
        <AdminField label="요약 (summary)">
          <AdminTextarea
            placeholder="ex) (앱 이름)은 사용자를 우선하는 송금 경험을 제공합니다. ..."
            rows={2}
            key={form.key('summary')}
            {...form.getInputProps('summary')}
          />
        </AdminField>
      </div>

      <AdminActions>
        <Button type="submit" variant="contained" color="primary" disabled={loading}>
          저장
        </Button>
      </AdminActions>
    </form>
  );
});

'use client';

import { NewProductFeatureForm } from '@darun/products-feature';
import { Button } from '@darun/ui';
import { AdminField, AdminInput, AdminTextarea, AdminActions } from '@darun/ui-admin';
import data from '@emoji-mart/data';
import Picker from '@emoji-mart/react';

type NewProductFeatureFormSectionProps = {
  productSlug: string;
};

export const NewProductFeatureFormSection = ({ productSlug }: NewProductFeatureFormSectionProps) => (
  <NewProductFeatureForm productSlug={productSlug}>
    {({ form, pickEmoji }) => (
      <div className="flex flex-col gap-3">
        <AdminField label="이름" error={form.errors.name}>
          <AdminInput
            name="name"
            form="new-product-form"
            placeholder={'ex) 검색'}
            {...form.getInputProps('name')}
          />
        </AdminField>
        <AdminField label="이모지" error={form.errors.emoji}>
          <div className="relative">
            <AdminInput
              name="emoji"
              className="pr-28"
              {...form.getInputProps('emoji')}
            />
            <details className="absolute right-2 top-1/2 -translate-y-1/2">
              <summary className="list-none">
                <Button type="button" variant="contained" color="secondary" size="sm">
                  뭐쓸까?
                </Button>
              </summary>
              <div className="absolute right-0 top-full z-10 mt-2 overflow-hidden rounded-xl border border-dark-200 bg-white shadow-lg">
                <Picker data={data} onEmojiSelect={pickEmoji} />
              </div>
            </details>
          </div>
        </AdminField>
        <AdminField label="짧은 설명" error={form.errors.summary}>
          <AdminTextarea
            name="summary"
            placeholder={'ex) 이러이러해서 이러이러한 기능'}
            rows={4}
            {...form.getInputProps('summary')}
          />
        </AdminField>
        <AdminActions>
          <Button type="submit" size="md" variant="contained" color="primary">
            등록
          </Button>
        </AdminActions>
      </div>
    )}
  </NewProductFeatureForm>
);

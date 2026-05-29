'use client';

import { NewProductFeatureForm } from '@darun/products-feature';
import { Button } from '@darun/ui';
import data from '@emoji-mart/data';
import Picker from '@emoji-mart/react';

type NewProductFeatureFormSectionProps = {
  productSlug: string;
};

export const NewProductFeatureFormSection = ({ productSlug }: NewProductFeatureFormSectionProps) => (
  <NewProductFeatureForm productSlug={productSlug}>
    {({ form, pickEmoji }) => (
      <div className="flex flex-col gap-3">
        <label className="flex flex-col gap-1 text-sm font-medium text-dark-900">
          <span>이름</span>
          <input
            name="name"
            form="new-product-form"
            placeholder={'ex) 검색'}
            className="rounded-xl border border-black/10 px-3 py-2 text-sm text-dark-900 outline-none transition focus:border-dark-900"
            {...form.getInputProps('name')}
          />
          {form.errors.name && <p className="mt-1 text-xs text-red-500">{form.errors.name}</p>}
        </label>
        <label className="flex flex-col gap-1 text-sm font-medium text-dark-900">
          <span>이모지</span>
          <div className="relative">
            <input
              name="emoji"
              className="w-full rounded-xl border border-black/10 px-3 py-2 pr-28 text-sm text-dark-900 outline-none transition focus:border-dark-900"
              {...form.getInputProps('emoji')}
            />
            <details className="absolute right-2 top-1/2 -translate-y-1/2">
              <summary className="list-none">
                <Button type="button" variant="contained" color="secondary" size="sm">
                  뭐쓸까?
                </Button>
              </summary>
              <div className="absolute right-0 top-full z-10 mt-2 overflow-hidden rounded-xl border border-black/10 bg-white shadow-lg">
                <Picker data={data} onEmojiSelect={pickEmoji} />
              </div>
            </details>
          </div>
          {form.errors.emoji && <p className="mt-1 text-xs text-red-500">{form.errors.emoji}</p>}
        </label>
        <label className="flex flex-col gap-1 text-sm font-medium text-dark-900">
          <span>짧은 설명</span>
          <textarea
            name="summary"
            placeholder={'ex) 이러이러해서 이러이러한 기능'}
            rows={4}
            className="min-h-28 rounded-xl border border-black/10 px-3 py-2 text-sm text-dark-900 outline-none transition focus:border-dark-900"
            {...form.getInputProps('summary')}
          />
          {form.errors.summary && <p className="mt-1 text-xs text-red-500">{form.errors.summary}</p>}
        </label>
        <Button type="submit" size="md" variant="contained" color="secondary">
          등록
        </Button>
      </div>
    )}
  </NewProductFeatureForm>
);

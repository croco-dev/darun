'use client';

import { NewProductScreenForm } from '@darun/products-feature';
import { Button } from '@darun/ui';

type NewProductFeatureFormSectionProps = {
  productSlug: string;
};

export const NewProductScreenshotFormSection = ({ productSlug }: NewProductFeatureFormSectionProps) => (
  <NewProductScreenForm productSlug={productSlug}>
    {({ form }) => (
      <div className="flex flex-col gap-3">
        <label className="flex flex-col gap-1 text-sm font-medium text-dark-900">
          <span>이미지</span>
          <input
            name="file"
            type="file"
            accept="image/png,image/jpeg,image/webp"
            className="rounded-xl border border-black/10 px-3 py-2 text-sm text-dark-900 file:mr-3 file:rounded-lg file:border-0 file:bg-black/5 file:px-3 file:py-1.5 file:text-sm file:font-medium"
            onChange={event => form.getInputProps('file').onChange(event.currentTarget.files?.[0] ?? undefined)}
          />
        </label>
        <label className="flex flex-col gap-1 text-sm font-medium text-dark-900">
          <span>이미지 alt</span>
          <input
            name="imageAlt"
            placeholder={'ex) 서비스 화면 이미지'}
            className="rounded-xl border border-black/10 px-3 py-2 text-sm text-dark-900 outline-none transition focus:border-dark-900"
            {...form.getInputProps('imageAlt')}
          />
        </label>
        <Button type="submit" size="md" variant="contained" color="secondary">
          추가!
        </Button>
      </div>
    )}
  </NewProductScreenForm>
);

'use client';

import { NewProductScreenForm } from '@darun/products-feature';
import { Button } from '@darun/ui';
import { AdminField, AdminInput, AdminActions } from '@darun/ui-admin';

type NewProductFeatureFormSectionProps = {
  productSlug: string;
};

export const NewProductScreenshotFormSection = ({ productSlug }: NewProductFeatureFormSectionProps) => (
  <NewProductScreenForm productSlug={productSlug}>
    {({ form }) => (
      <div className="flex flex-col gap-3">
        <AdminField label="이미지" error={form.errors.file}>
          <AdminInput
            name="file"
            type="file"
            accept="image/png,image/jpeg,image/webp"
            className="file:mr-3 file:rounded-lg file:border-0 file:bg-black/5 file:px-3 file:py-1.5 file:text-sm file:font-medium"
            onChange={event => form.getInputProps('file').onChange(event.currentTarget.files?.[0] ?? undefined)}
          />
        </AdminField>
        <AdminField label="이미지 alt" error={form.errors.imageAlt}>
          <AdminInput
            name="imageAlt"
            placeholder={'ex) 서비스 화면 이미지'}
            {...form.getInputProps('imageAlt')}
          />
        </AdminField>
        <AdminActions>
          <Button type="submit" size="md" variant="contained" color="primary">
            추가!
          </Button>
        </AdminActions>
      </div>
    )}
  </NewProductScreenForm>
);

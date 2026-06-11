'use client';

import { NewProductForm } from '@darun/products-feature';
import { Button } from '@darun/ui';
import { AdminPanel, AdminSectionHeader, AdminSectionBody, AdminField, AdminInput, AdminTextarea, AdminActions } from '@darun/ui-admin';

export const NewProductFormSection = () => (
  <NewProductForm>
    {({ form }) => (
      <AdminPanel>
        <AdminSectionHeader title="서비스 등록" />
        <AdminSectionBody>
          <AdminField label="이름">
            <AdminInput
              name="name"
              form="new-product-form"
              placeholder="ex) NAVER"
              {...form.getInputProps('name')}
            />
          </AdminField>
          <AdminField label="slug">
            <AdminInput
              name="slug"
              placeholder="ex) naver"
              {...form.getInputProps('slug')}
            />
          </AdminField>
          <AdminField label="짧은 설명">
            <AdminTextarea
              name="summary"
              rows={4}
              placeholder="ex) 국내 검색 엔진 1위 기업. 포털 사이트로도 유명하다. 네이버 검색, 뉴스, 지도, 카페, 블로그 서비스를 제공하고 있으며, 네이버 웨일, 네이버 클라우드, 네이버 페이 등 다양한 서비스를 운영하고 있습니다."
              {...form.getInputProps('summary')}
            />
          </AdminField>
          <AdminField label="로고">
            <AdminInput
              name="file"
              type="file"
              accept="image/png,image/jpeg,image/webp"
              className="file:mr-3 file:rounded-lg file:border-0 file:bg-black/5 file:px-3 file:py-1.5 file:text-sm file:font-medium"
              onChange={event => form.getInputProps('file').onChange(event.currentTarget.files?.[0] ?? undefined)}
            />
          </AdminField>
          <AdminActions>
            <Button type="submit" size="md" variant="contained" color="primary">
              등록
            </Button>
          </AdminActions>
        </AdminSectionBody>
      </AdminPanel>
    )}
  </NewProductForm>
);

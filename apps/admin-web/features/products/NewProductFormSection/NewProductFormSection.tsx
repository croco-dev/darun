'use client';

import { NewProductForm } from '@darun/products-feature';
import { Button } from '@darun/ui';
import {
  AdminPanel,
  AdminSectionHeader,
  AdminSectionBody,
  AdminField,
  AdminInput,
  AdminTextarea,
  AdminActions,
} from '@darun/ui-admin';
import { useEffect, useState } from 'react';

export const NewProductFormSection = () => {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  useEffect(() => {
    return () => {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);

  return (
    <NewProductForm>
      {({ form, loading }) => (
        <AdminPanel>
          <AdminSectionHeader title="서비스 등록" />
          <AdminSectionBody>
            <AdminField label="이름" error={form.errors.name}>
              <AdminInput name="name" placeholder="ex) NAVER" {...form.getInputProps('name')} />
            </AdminField>
            <AdminField label="slug" error={form.errors.slug}>
              <AdminInput name="slug" placeholder="ex) naver" {...form.getInputProps('slug')} />
            </AdminField>
            <AdminField label="짧은 설명" error={form.errors.summary}>
              <AdminTextarea
                name="summary"
                rows={4}
                placeholder="ex) 국내 검색 엔진 1위 기업. 포털 사이트로도 유명하다. 네이버 검색, 뉴스, 지도, 카페, 블로그 서비스를 제공하고 있으며, 네이버 웨일, 네이버 클라우드, 네이버 페이 등 다양한 서비스를 운영하고 있습니다."
                {...form.getInputProps('summary')}
              />
            </AdminField>
            <AdminField label="로고" error={form.errors.file}>
              <div className="flex flex-col gap-2">
                <AdminInput
                  name="file"
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  className="file:mr-3 file:rounded-lg file:border-0 file:bg-black/5 file:px-3 file:py-1.5 file:text-sm file:font-medium"
                  onChange={event => {
                    const file = event.currentTarget.files?.[0] ?? undefined;
                    form.getInputProps('file').onChange(file);
                    if (previewUrl) {
                      URL.revokeObjectURL(previewUrl);
                    }
                    if (file) {
                      setPreviewUrl(URL.createObjectURL(file));
                    } else {
                      setPreviewUrl(null);
                    }
                  }}
                />
                {previewUrl && (
                  <div className="flex items-center gap-3">
                    <img
                      src={previewUrl}
                      alt="로고 미리보기"
                      className="h-12 w-12 rounded-lg border border-dark-200 object-contain p-1 bg-white"
                    />
                    <span className="text-xs text-dark-500">선택된 로고 미리보기</span>
                  </div>
                )}
              </div>
            </AdminField>
            <AdminActions>
              <Button type="submit" size="md" variant="contained" color="primary" disabled={loading}>
                {loading ? '등록 중...' : '등록'}
              </Button>
            </AdminActions>
          </AdminSectionBody>
        </AdminPanel>
      )}
    </NewProductForm>
  );
};

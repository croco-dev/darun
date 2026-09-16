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
import { Link } from '@darun/utils-router';
import { notifications } from '@mantine/notifications';
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
              <AdminInput name="name" disabled={loading} placeholder="ex) NAVER" {...form.getInputProps('name')} />
            </AdminField>
            <AdminField label="slug" error={form.errors.slug}>
              <AdminInput name="slug" disabled={loading} placeholder="ex) naver" {...form.getInputProps('slug')} />
            </AdminField>
            <AdminField label="짧은 설명" error={form.errors.summary}>
              <AdminTextarea
                name="summary"
                disabled={loading}
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
                  disabled={loading}
                  accept="image/png,image/jpeg,image/webp"
                  className="file:mr-3 file:rounded-lg file:border-0 file:bg-black/5 file:px-3 file:py-1.5 file:text-sm file:font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                  onChange={event => {
                    const file = event.currentTarget.files?.[0] ?? undefined;
                    if (file && !file.type.startsWith('image/')) {
                      notifications.show({
                        message: '이미지 파일(PNG, JPEG, WebP)만 업로드할 수 있습니다.',
                        color: 'red',
                      });
                      event.currentTarget.value = '';
                      form.getInputProps('file').onChange(undefined);
                      if (previewUrl) {
                        URL.revokeObjectURL(previewUrl);
                        setPreviewUrl(null);
                      }
                      return;
                    }
                    const MAX_LOGO_SIZE = 5 * 1024 * 1024;
                    if (file && file.size > MAX_LOGO_SIZE) {
                      notifications.show({
                        message: '로고 이미지는 5MB 이하만 업로드할 수 있습니다.',
                        color: 'red',
                      });
                      event.currentTarget.value = '';
                      form.getInputProps('file').onChange(undefined);
                      if (previewUrl) {
                        URL.revokeObjectURL(previewUrl);
                        setPreviewUrl(null);
                      }
                      return;
                    }
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
              <Button as={Link} href="/products" variant="contained" color="secondary" disabled={loading}>
                취소
              </Button>
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

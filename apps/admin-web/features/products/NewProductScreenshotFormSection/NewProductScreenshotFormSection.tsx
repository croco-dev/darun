'use client';

import { NewProductScreenForm } from '@darun/products-feature';
import { Button } from '@darun/ui';
import { AdminField, AdminInput, AdminActions } from '@darun/ui-admin';
import { Link } from '@darun/utils-router';
import { notifications } from '@mantine/notifications';
import { useEffect, useState } from 'react';

type NewProductScreenshotFormSectionProps = {
  productSlug: string;
};

export const NewProductScreenshotFormSection = ({ productSlug }: NewProductScreenshotFormSectionProps) => {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  useEffect(() => {
    return () => {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);

  return (
    <NewProductScreenForm productSlug={productSlug}>
      {({ form, loading }) => (
        <div className="flex flex-col gap-3">
          <AdminField label="이미지" error={form.errors.file}>
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
                  const MAX_SCREENSHOT_SIZE = 10 * 1024 * 1024;
                  if (file && file.size > MAX_SCREENSHOT_SIZE) {
                    notifications.show({
                      message: '스크린샷 이미지는 10MB 이하만 업로드할 수 있습니다.',
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
                    alt="스크린샷 미리보기"
                    className="h-24 w-auto rounded-lg border border-dark-200 object-contain p-1 bg-white"
                  />
                  <span className="text-xs text-dark-500">선택된 스크린샷 미리보기</span>
                </div>
              )}
            </div>
          </AdminField>
          <AdminField label="이미지 alt" error={form.errors.imageAlt}>
            <AdminInput
              name="imageAlt"
              disabled={loading}
              placeholder={'ex) 서비스 화면 이미지'}
              {...form.getInputProps('imageAlt')}
            />
          </AdminField>
          <AdminActions>
            <Button
              as={Link}
              href={`/products/${productSlug}`}
              variant="contained"
              color="secondary"
              disabled={loading}
            >
              취소
            </Button>
            <Button type="submit" size="md" variant="contained" color="primary" disabled={loading}>
              {loading ? '추가 중...' : '추가'}
            </Button>
          </AdminActions>
        </div>
      )}
    </NewProductScreenForm>
  );
};

'use client';

import { Button } from '@darun/ui';
import { AdminActions, AdminField, AdminInput } from '@darun/ui-admin';
import { Link } from '@darun/utils-router';
import { bind } from '@darun/utils-structure-react';
import { useRef } from 'react';
import { useWriteMagazine } from './useWriteMagazine';

export const WriteMagazine = bind(
  useWriteMagazine,
  ({ form, handleSubmit, handleFileDrop, file, previewUrl, handleFileRemove, isSubmitting, isUploading }) => {
    const fileInputRef = useRef<HTMLInputElement>(null);
    return (
      <form onSubmit={form.onSubmit(handleSubmit)}>
        <div className="flex flex-col gap-4">
          <AdminField label="글 제목" error={form.errors.title}>
            <AdminInput
              id="magazine-title"
              type="text"
              placeholder="ex) 다른의 서비스 종료 발표, 대안 서비스는 뭐가 있을까?"
              key={form.key('title')}
              disabled={isSubmitting}
              {...form.getInputProps('title')}
            />
          </AdminField>

          <AdminField
            label="슬러그(slug) (선택, 미입력시 자동생성)"
            help="링크로 뒤에 표시될 내용입니다. 띄어쓰기가 있어서는 안됩니다. / 사용 예: darun-io → https://darun.io/magazines/darun-io"
            error={form.errors.slug}
          >
            <AdminInput
              id="magazine-slug"
              type="text"
              placeholder="ex) darun-io-service-jongryo"
              key={form.key('slug')}
              disabled={isSubmitting}
              {...form.getInputProps('slug')}
            />
          </AdminField>

          <AdminField label="한 줄 요약" error={form.errors.summary}>
            <AdminInput
              id="magazine-summary"
              type="text"
              placeholder="ex) 사용자가 없기에 종료의 영향이 없지만, 제가 슬프니 정리해봤습니다."
              key={form.key('summary')}
              disabled={isSubmitting}
              {...form.getInputProps('summary')}
            />
          </AdminField>

          <AdminField label="뒷 배경 이미지">
            {!file ? (
              <button
                id="magazine-background-image"
                type="button"
                disabled={isSubmitting}
                onDragOver={e => e.preventDefault()}
                onDrop={e => {
                  e.preventDefault();
                  if (isSubmitting) return;
                  const droppedFile = e.dataTransfer.files[0];
                  if (droppedFile) {
                    handleFileDrop([droppedFile]);
                  }
                }}
                onClick={() => {
                  if (isSubmitting) return;
                  fileInputRef.current?.click();
                }}
                className="flex min-h-56 w-full cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed border-dark-200 bg-white transition hover:border-dark-400 focus:outline-none focus-visible:ring-2 focus-visible:ring-dark-900/40 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/png,image/jpeg,image/webp,image/bmp,image/avif"
                  className="hidden"
                  onChange={e => {
                    const target = e.target;
                    if (target.files && target.files[0]) {
                      handleFileDrop([target.files[0]]);
                    }
                    target.value = '';
                  }}
                />
                <div className="flex flex-col items-center gap-4 p-8">
                  <svg
                    className="h-12 w-12 text-dark-400"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                    aria-hidden="true"
                  >
                    <title>이미지 업로드</title>
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={1.5}
                      d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                    />
                  </svg>
                  <div className="text-center">
                    <p className="text-lg font-medium text-dark-900">이미지 끌어오거나 클릭하여 첨부</p>
                    <p className="mt-2 text-sm text-dark-500">
                      한개만 첨부해주세요. png, jpg, jpeg, webp, bmp, avif 등 지원
                    </p>
                  </div>
                </div>
              </button>
            ) : (
              <div className="flex items-center gap-4">
                <div className="relative">
                  {previewUrl && (
                    <img
                      src={previewUrl}
                      alt="Preview"
                      className="h-48 w-auto rounded-lg border border-dark-200 object-contain"
                    />
                  )}
                  {isUploading && (
                    <div className="absolute inset-0 flex items-center justify-center rounded-lg bg-black/40 text-white text-xs font-medium backdrop-blur-xs">
                      <div className="flex items-center gap-2">
                        <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                        <span>업로드 중...</span>
                      </div>
                    </div>
                  )}
                </div>
                <Button
                  type="button"
                  variant="contained"
                  color="secondary"
                  disabled={isSubmitting}
                  onClick={() => handleFileRemove()}
                  className="!bg-red-600 hover:!bg-red-700 !text-white !border-transparent"
                >
                  이미지 삭제
                </Button>
              </div>
            )}
          </AdminField>
        </div>

        <p className="mt-4 text-xs text-dark-500">글 작성은 저장 후, 수정 기능을 이용하여 가능합니다.</p>

        <AdminActions>
          <Button as={Link} href="/magazines" variant="contained" color="secondary" disabled={isSubmitting}>
            취소
          </Button>
          <Button type="submit" variant="contained" color="primary" disabled={isSubmitting}>
            {isSubmitting ? '저장 중...' : '저장'}
          </Button>
        </AdminActions>
      </form>
    );
  }
);

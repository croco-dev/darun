'use client';

import { bind } from '@croco/utils-structure-react';
import React from 'react';
import { useWriteMagazine } from './useWriteMagazine';

export const WriteMagazine = bind(
  useWriteMagazine,
  ({ form, handleSubmit, handleFileDrop, file, handleFileRemove }) => {
    const ImagePreview = () => {
      if (!file) return null;
      const imageUrl = URL.createObjectURL(file);
      return (
        <img
          src={imageUrl}
          alt="Preview"
          onLoad={() => URL.revokeObjectURL(imageUrl)}
          className="h-48 w-auto object-contain"
        />
      );
    };

    return (
      <form onSubmit={form.onSubmit(handleSubmit)}>
        <div className="flex flex-col gap-3">
          <div>
            <label htmlFor="magazine-title" className="mb-1 block text-sm font-medium">
              글 제목
            </label>
            <input
              id="magazine-title"
              type="text"
              placeholder="ex) 다른의 서비스 종료 발표, 대안 서비스는 뭐가 있을까?"
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
              key={form.key('title')}
              {...form.getInputProps('title')}
            />
          </div>
          <div>
            <div className="mb-1">
              <label htmlFor="magazine-slug" className="block text-sm font-medium">
                슬러그(slug) (선택, 미입력시 자동생성)
              </label>
            </div>
            <input
              id="magazine-slug"
              type="text"
              placeholder="ex) darun-io-service-jongryo"
              className="mb-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
              key={form.key('slug')}
              {...form.getInputProps('slug')}
            />
            <p className="text-xs text-gray-500">
              링크로 뒤에 표시될 내용입니다. 띄어쓰기가 있어서는 안됩니다. / 사용 예: darun-io →
              https://darun.io/magazines/darun-io
            </p>
          </div>
          <div>
            <label htmlFor="magazine-summary" className="mb-1 block text-sm font-medium">
              한 줄 요약
            </label>
            <input
              id="magazine-summary"
              type="text"
              placeholder="ex) 사용자가 없기에 종료의 영향이 없지만, 제가 슬프니 정리해봤습니다."
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
              key={form.key('summary')}
              {...form.getInputProps('summary')}
            />
          </div>
          <div>
            <label htmlFor="magazine-background-image" className="mb-1 block text-sm font-medium">
              뒷 배경 이미지
            </label>

            {!file ? (
              <button
                id="magazine-background-image"
                type="button"
                onDragOver={e => e.preventDefault()}
                onDrop={e => {
                  e.preventDefault();
                  const droppedFile = e.dataTransfer.files[0];
                  if (droppedFile) {
                    handleFileDrop([droppedFile]);
                  }
                }}
                onClick={() => {
                  const input = document.createElement('input');
                  input.type = 'file';
                  input.accept = 'image/png,image/jpeg,image/webp,image/bmp,image/avif';
                  input.onchange = e => {
                    const target = e.target as HTMLInputElement;
                    if (target.files && target.files[0]) {
                      handleFileDrop([target.files[0]]);
                    }
                  };
                  input.click();
                }}
                className="flex min-h-[220px] cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed border-gray-300 transition-colors hover:border-gray-400"
              >
                <div className="flex flex-col items-center gap-4 p-8">
                  <svg
                    className="h-12 w-12 text-gray-400"
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
                    <p className="text-lg font-medium">이미지 끌어오거나 클릭하여 첨부</p>
                    <p className="mt-2 text-sm text-gray-500">
                      한개만 첨부해주세요. png, jpg, jpeg, webp, bmp, avif 등 지원
                    </p>
                  </div>
                </div>
              </button>
            ) : (
              <div className="flex items-center gap-4">
                <ImagePreview />
                <button
                  type="button"
                  onClick={() => handleFileRemove()}
                  className="rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-gray-800"
                >
                  이미지 삭제
                </button>
              </div>
            )}
          </div>
        </div>

        <p className="mt-3 text-sm">글 작성은 저장 후, 수정 기능을 이용하여 가능합니다.</p>

        <div className="mt-4 flex justify-end">
          <button
            type="submit"
            className="rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-gray-800"
          >
            저장
          </button>
        </div>
      </form>
    );
  }
);

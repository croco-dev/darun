'use client';

import { NewProductFeatureForm } from '@darun/products-feature';
import { Button, Smile } from '@darun/ui';
import { AdminField, AdminInput, AdminTextarea, AdminActions } from '@darun/ui-admin';
import { Link } from '@darun/utils-router';
import data from '@emoji-mart/data';
import Picker from '@emoji-mart/react';
import { useEffect, useRef } from 'react';

type NewProductFeatureFormSectionProps = {
  productSlug: string;
};

export const NewProductFeatureFormSection = ({ productSlug }: NewProductFeatureFormSectionProps) => {
  const detailsRef = useRef<HTMLDetailsElement | null>(null);

  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (detailsRef.current && detailsRef.current.open && !detailsRef.current.contains(e.target as Node)) {
        detailsRef.current.open = false;
      }
    };
    document.addEventListener('click', handleOutsideClick);
    return () => {
      document.removeEventListener('click', handleOutsideClick);
    };
  }, []);

  return (
    <NewProductFeatureForm productSlug={productSlug}>
      {({ form, pickEmoji, loading }) => (
        <div className="flex flex-col gap-3">
          <AdminField label="이름" error={form.errors.name}>
            <AdminInput name="name" disabled={loading} placeholder={'ex) 검색'} {...form.getInputProps('name')} />
          </AdminField>
          <AdminField label="이모지" error={form.errors.emoji}>
            <div className="relative">
              <AdminInput name="emoji" disabled={loading} className="pr-28" {...form.getInputProps('emoji')} />
              <details
                ref={detailsRef}
                className={`absolute right-2 top-1/2 -translate-y-1/2 ${loading ? 'pointer-events-none opacity-50' : ''}`}
              >
                <summary
                  className="list-none inline-flex items-center gap-1.5 justify-center cursor-pointer rounded-lg border border-dark-200 bg-dark-100 hover:bg-dark-150 px-2.5 py-1 text-xs font-medium text-dark-800 select-none min-h-[32px] active:scale-95 motion-reduce:transform-none focus:outline-none focus-visible:ring-2 focus-visible:ring-dark-900/40"
                  aria-label="이모지 선택기 열기"
                >
                  <Smile size={13} className="shrink-0 text-dark-500" aria-hidden="true" />
                  <span className="whitespace-nowrap">이모지 선택</span>
                </summary>
                <div className="absolute right-0 top-full z-10 mt-2 overflow-hidden rounded-xl border border-dark-200 bg-white shadow-lg">
                  <Picker
                    data={data}
                    onEmojiSelect={(emoji: { native: string }) => {
                      pickEmoji(emoji);
                      if (detailsRef.current) {
                        detailsRef.current.open = false;
                      }
                    }}
                  />
                </div>
              </details>
            </div>
          </AdminField>
          <AdminField label="짧은 설명" error={form.errors.summary}>
            <AdminTextarea
              name="summary"
              disabled={loading}
              placeholder={'ex) 이러이러해서 이러이러한 기능'}
              rows={4}
              {...form.getInputProps('summary')}
            />
          </AdminField>
          <AdminActions>
            <Button
              as={Link}
              href={`/products/${productSlug}`}
              variant="contained"
              color="secondary"
              size="md"
              disabled={loading}
              className="active:scale-[0.98] motion-reduce:transform-none"
            >
              <span className="whitespace-nowrap">취소</span>
            </Button>
            <Button
              type="submit"
              size="md"
              variant="contained"
              color="primary"
              disabled={loading}
              className="active:scale-[0.98] motion-reduce:transform-none"
            >
              <span className="whitespace-nowrap">{loading ? '등록 중...' : '등록'}</span>
            </Button>
          </AdminActions>
        </div>
      )}
    </NewProductFeatureForm>
  );
};

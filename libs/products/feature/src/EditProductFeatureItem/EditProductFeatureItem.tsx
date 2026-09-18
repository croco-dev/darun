'use client';

import { Button, Smile } from '@darun/ui';
import { AdminField, AdminInput, AdminTextarea, AdminActions } from '@darun/ui-admin';
import { bind } from '@darun/utils-structure-react';
import data from '@emoji-mart/data';
import Picker from '@emoji-mart/react';
import { useEffect, useRef } from 'react';
import { useEditProductFeatureItem } from './useEditProductFeatureItem';

export const EditProductFeatureItem = bind(useEditProductFeatureItem, ({ form, submit, onCancel, loading }) => {
  const detailsRef = useRef<HTMLDetailsElement | null>(null);

  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (detailsRef.current?.open && !detailsRef.current.contains(e.target as Node)) {
        detailsRef.current.open = false;
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && detailsRef.current?.open) {
        detailsRef.current.open = false;
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  return (
    <form onSubmit={form.onSubmit(submit)}>
      <div className="flex flex-col gap-2">
        <AdminField label="이모지" error={form.errors.emoji}>
          <div className="relative">
            <AdminInput
              placeholder="이모지 선택은 우측 버튼으로도 가능 ->"
              disabled={loading}
              key={form.key('emoji')}
              {...form.getInputProps('emoji')}
            />
            <details ref={detailsRef} className="absolute right-2 top-1/2 -translate-y-1/2">
              <summary
                className="list-none inline-flex items-center justify-center cursor-pointer rounded-lg border border-dark-200 bg-dark-100 hover:bg-dark-150 p-1.5 text-xs select-none focus:outline-none focus-visible:ring-2 focus-visible:ring-dark-900/40"
                aria-label="이모지 선택기 열기"
              >
                <Smile size={16} className="text-dark-700" />
              </summary>
              <div className="absolute right-0 top-full z-10 mt-2 overflow-hidden rounded-xl border border-dark-200 bg-white shadow-lg">
                <Picker
                  data={data}
                  onEmojiSelect={({ native }: { native: string }) => {
                    form.setValues({ emoji: native });
                    if (detailsRef.current) {
                      detailsRef.current.open = false;
                    }
                  }}
                />
              </div>
            </details>
          </div>
        </AdminField>
        <AdminField label="기능 이름 (name)" error={form.errors.name}>
          <AdminTextarea
            placeholder="ex) 송금"
            rows={2}
            disabled={loading}
            key={form.key('name')}
            {...form.getInputProps('name')}
          />
        </AdminField>
        <AdminField label="요약 (summary)" error={form.errors.summary}>
          <AdminTextarea
            placeholder="ex) (앱 이름)은 사용자를 우선하는 송금 경험을 제공합니다. ..."
            rows={2}
            disabled={loading}
            key={form.key('summary')}
            {...form.getInputProps('summary')}
          />
        </AdminField>
      </div>

      <AdminActions>
        {onCancel && (
          <Button type="button" variant="contained" color="secondary" onClick={onCancel} disabled={loading}>
            취소
          </Button>
        )}
        <Button type="submit" variant="contained" color="primary" disabled={loading}>
          {loading ? '저장 중...' : '저장'}
        </Button>
      </AdminActions>
    </form>
  );
});

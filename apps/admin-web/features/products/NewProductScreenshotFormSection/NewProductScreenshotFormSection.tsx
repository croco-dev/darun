'use client';

import { NewProductScreenForm } from '@darun/products-feature';
import { Button } from '@darun/ui';
import { AdminField, AdminInput, AdminActions, AdminSelect } from '@darun/ui-admin';
import { Link } from '@darun/utils-router';
import { notifications } from '@mantine/notifications';
import { useRef, useState } from 'react';
import { MAX_SCREENSHOT_BYTES } from './screenshotRedaction';
import { LocalScreenshotPreview, ScreenshotRedactionEditor } from './ScreenshotRedactionEditor';

type NewProductScreenshotFormSectionProps = {
  productSlug: string;
};

export const NewProductScreenshotFormSection = ({ productSlug }: NewProductScreenshotFormSectionProps) => {
  const fileInput = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File>();
  const [fileSelection, setFileSelection] = useState(0);
  const [redacting, setRedacting] = useState(false);
  const [redactionPending, setRedactionPending] = useState(false);

  return (
    <NewProductScreenForm productSlug={productSlug}>
      {({ form, loading, isUploading, cancelUpload }) => (
        <div className="flex flex-col gap-3">
          <AdminField label="이미지" error={form.errors.file}>
            <AdminInput
              ref={fileInput}
              type="file"
              disabled={loading}
              accept="image/png,image/jpeg,image/webp"
              className="file:mr-3 file:rounded-lg file:border-0 file:bg-black/5 file:px-3 file:py-1.5 file:text-sm file:font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              onChange={event => {
                let next = event.currentTarget.files?.[0];
                let error: string | undefined;
                if (next && !next.type.startsWith('image/')) {
                  error = '이미지 파일(PNG, JPEG, WebP)만 업로드할 수 있습니다.';
                } else if (next && next.size > MAX_SCREENSHOT_BYTES) {
                  error = '스크린샷 이미지는 10MB 이하만 업로드할 수 있습니다.';
                }
                if (error) {
                  notifications.show({ message: error, color: 'red' });
                  event.currentTarget.value = '';
                  next = undefined;
                }
                form.setFieldValue('file', redacting ? undefined : next);
                form.clearFieldError('file');
                setRedactionPending(redacting);
                setFile(next);
                setFileSelection(current => current + 1);
              }}
            />
          </AdminField>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={redacting}
              disabled={loading}
              onChange={event => {
                const enabled = event.currentTarget.checked;
                // Never restore an original file to the upload form when leaving the editor.
                form.setFieldValue('file', undefined);
                form.clearFieldError('file');
                setRedacting(enabled);
                setRedactionPending(enabled);
                if (!enabled) {
                  setFile(undefined);
                  if (fileInput.current) fileInput.current.value = '';
                  fileInput.current?.focus();
                }
              }}
            />
            <span>업로드 전에 민감한 부분 가리기</span>
          </label>
          {file &&
            (redacting ? (
              <ScreenshotRedactionEditor
                key={fileSelection}
                file={file}
                disabled={loading}
                onUploadFileChange={result => {
                  form.setFieldValue('file', result);
                  form.clearFieldError('file');
                  setRedactionPending(!result);
                }}
              />
            ) : (
              <LocalScreenshotPreview
                key={fileSelection}
                file={file}
                alt="스크린샷 미리보기"
                className="h-24 w-auto max-w-full self-start rounded-lg border border-dark-200 bg-white object-contain p-1"
              />
            ))}
          <AdminField label="이미지 alt" error={form.errors.imageAlt}>
            <AdminInput
              name="imageAlt"
              disabled={loading}
              placeholder={'ex) 서비스 화면 이미지'}
              {...form.getInputProps('imageAlt')}
            />
          </AdminField>
          <AdminField label="제목 (선택)" error={form.errors.title}>
            <AdminInput
              name="title"
              disabled={loading}
              placeholder="ex) 회원가입 화면"
              maxLength={100}
              {...form.getInputProps('title')}
            />
          </AdminField>
          <AdminField label="플랫폼 (선택)" error={form.errors.platform}>
            <AdminSelect name="platform" disabled={loading} {...form.getInputProps('platform')}>
              <option value="">미분류</option>
              <option value="WEB">웹</option>
              <option value="IOS">iOS</option>
              <option value="ANDROID">Android</option>
            </AdminSelect>
          </AdminField>
          <AdminField label="화면 유형 (선택)" error={form.errors.screenType}>
            <AdminSelect name="screenType" disabled={loading} {...form.getInputProps('screenType')}>
              <option value="">미분류</option>
              <option value="HOME">홈</option>
              <option value="ONBOARDING">온보딩</option>
              <option value="SIGN_UP">회원가입</option>
              <option value="SIGN_IN">로그인</option>
              <option value="SEARCH">검색</option>
              <option value="LIST">목록</option>
              <option value="DETAIL">상세</option>
              <option value="CHECKOUT">결제</option>
              <option value="SETTINGS">설정</option>
              <option value="OTHER">기타</option>
            </AdminSelect>
          </AdminField>
          <AdminActions>
            {isUploading ? (
              <Button type="button" variant="contained" color="secondary" size="md" onClick={cancelUpload}>
                업로드 취소
              </Button>
            ) : (
              <Button
                as={Link}
                href={`/products/${productSlug}`}
                variant="contained"
                color="secondary"
                size="md"
                disabled={loading}
                className="active:scale-[0.98] motion-reduce:transform-none"
              >
                <span className="select-none whitespace-nowrap">취소</span>
              </Button>
            )}
            <Button
              type="submit"
              size="md"
              variant="contained"
              color="primary"
              disabled={loading || redactionPending}
              className="active:scale-[0.98] motion-reduce:transform-none"
            >
              <span className="select-none whitespace-nowrap">{loading ? '추가 중...' : '추가'}</span>
            </Button>
          </AdminActions>
        </div>
      )}
    </NewProductScreenForm>
  );
};

'use client';

import { gql } from '@apollo/client';
import { Button } from '@darun/ui';
import { AdminField, AdminInput, AdminSelect, AdminActions, AdminModal } from '@darun/ui-admin';
import { getProductLinkLabel, orderPublicProductLinks, productLinkIconOptions } from '../productLinkPresentation';
import { ProductLinkRoleField } from '../ProductLinkRoleField';
import { useEditProductLinkItem, type EditProductLinkItemProps } from './useEditProductLinkItem';

gql`
  fragment EditProductLinkItem on Link {
    id
    title
    link
    displayLink
    iconUrl
    isPrimary
    role
  }
`;

const previewLanguages = [
  { locale: 'ko', label: '한국어', primary: '대표 링크' },
  { locale: 'en', label: '영어', primary: 'Primary link' },
] as const;

export function EditProductLinkItem(
  props: EditProductLinkItemProps & {
    links?: readonly EditProductLinkItemProps['link'][];
    onCancel: () => void;
  }
) {
  const { form, submit, cancel, loading, changes } = useEditProductLinkItem(props);
  const { link, links = [link] } = props;
  const storedCustomIcon = link.iconUrl && !productLinkIconOptions.some(({ value }) => value === link.iconUrl);
  const preview = orderPublicProductLinks(
    links.map(item => {
      const isPrimary = changes.makePrimary ? item.id === link.id : item.isPrimary;
      if (item.id !== link.id) return { ...item, isPrimary };
      return {
        ...item,
        isPrimary,
        title: changes.title ?? item.title,
        displayLink: changes.displayLink ?? item.displayLink,
        link: changes.link ?? item.link,
        role: changes.role === undefined ? item.role : changes.role,
      };
    })
  );
  return (
    <AdminModal opened onClose={cancel} title="링크 정보 수정">
      <form aria-busy={loading} onSubmit={form.onSubmit(submit)}>
        <div className="flex flex-col gap-2">
          <AdminField label="표시 링크" error={form.errors.displayLink}>
            <AdminInput
              type="text"
              placeholder="ex) toss.im"
              disabled={loading}
              key={form.key('displayLink')}
              {...form.getInputProps('displayLink')}
            />
          </AdminField>
          <AdminField label="링크" error={form.errors.link}>
            <AdminInput
              type="text"
              placeholder="ex) https://toss.im/"
              disabled={loading}
              key={form.key('link')}
              {...form.getInputProps('link')}
            />
          </AdminField>
          <AdminField
            label="이름"
            help="비워 두면 링크 역할의 기본 이름이나 표시 링크를 사용합니다."
            error={form.errors.title}
          >
            <AdminInput
              type="text"
              placeholder="ex) 공식 홈페이지"
              disabled={loading}
              key={form.key('title')}
              {...form.getInputProps('title')}
            />
          </AdminField>
          <ProductLinkRoleField disabled={loading} {...form.getInputProps('role')} />
          <AdminField label="아이콘" error={form.errors.iconUrl}>
            <AdminSelect disabled={loading} key={form.key('iconUrl')} {...form.getInputProps('iconUrl')}>
              <option value="" disabled={Boolean(link.iconUrl)}>
                아이콘을 선택해 주세요
              </option>
              {storedCustomIcon && <option value={link.iconUrl ?? ''}>현재 아이콘</option>}
              {productLinkIconOptions.map(icon => (
                <option key={icon.value} value={icon.value}>
                  {icon.label}
                </option>
              ))}
            </AdminSelect>
          </AdminField>
          <label className="flex w-fit items-center gap-2 py-2 text-sm font-medium text-dark-900">
            <input type="checkbox" disabled={loading} {...form.getInputProps('makePrimary', { type: 'checkbox' })} />이
            링크를 대표로 지정
          </label>
          <section className="space-y-2 rounded-lg bg-surface-100 p-3" aria-label="공개 링크 미리보기">
            <p className="text-sm font-medium text-dark-900">공개 링크 미리보기</p>
            {previewLanguages.map(({ locale, label, primary }) => (
              <div key={locale} className="flex items-start gap-2">
                <p className="w-12 shrink-0 py-2 text-sm text-dark-600">{label}</p>
                <ol className="flex min-w-0 flex-wrap gap-2" aria-label={label} lang={locale}>
                  {preview.map(item => (
                    <li
                      key={item.id}
                      className={`max-w-full break-words rounded-lg border px-3 py-2 text-sm ${
                        item.isPrimary
                          ? 'border-dark-800 bg-dark-900 text-white'
                          : 'border-dark-200 bg-white text-dark-900'
                      }`}
                    >
                      {getProductLinkLabel(item, locale)}
                      {item.isPrimary && <span className="sr-only"> ({primary})</span>}
                    </li>
                  ))}
                </ol>
              </div>
            ))}
          </section>
          <AdminActions>
            <Button
              type="button"
              variant="contained"
              color="secondary"
              className="active:scale-[0.98] motion-reduce:transform-none"
              onClick={cancel}
              disabled={loading}
            >
              취소
            </Button>
            <Button
              type="submit"
              variant="contained"
              color="primary"
              className="active:scale-[0.98] motion-reduce:transform-none"
              disabled={loading || Object.keys(changes).length === 0}
            >
              {loading ? '저장 중...' : '저장'}
            </Button>
          </AdminActions>
        </div>
      </form>
    </AdminModal>
  );
}

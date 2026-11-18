'use client';

import { NewProductLinkForm, ProductLinkRoleField, productLinkIconOptions } from '@darun/products-feature';
import { Button } from '@darun/ui';
import { AdminField, AdminInput, AdminSelect, AdminActions } from '@darun/ui-admin';
import { Link } from '@darun/utils-router';

type NewProductLinkSectionProps = {
  productSlug: string;
};

export const NewProductLinkSection = ({ productSlug }: NewProductLinkSectionProps) => (
  <NewProductLinkForm productSlug={productSlug}>
    {({ form, loading }) => (
      <div className="flex flex-col gap-3">
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
        <AdminField label="이름" help="비워 두면 링크 역할의 기본 이름을 사용합니다." error={form.errors.title}>
          <AdminInput
            type="text"
            placeholder="ex) 공식 홈페이지"
            disabled={loading}
            key={form.key('title')}
            {...form.getInputProps('title')}
          />
        </AdminField>
        <ProductLinkRoleField key={form.key('role')} disabled={loading} {...form.getInputProps('role')} />
        <AdminField label="아이콘" error={form.errors.iconUrl}>
          <AdminSelect disabled={loading} key={form.key('iconUrl')} {...form.getInputProps('iconUrl')}>
            <option value="">아이콘을 선택해 주세요</option>
            {productLinkIconOptions.map(icon => (
              <option key={icon.value} value={icon.value}>
                {icon.label}
              </option>
            ))}
          </AdminSelect>
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
            variant="contained"
            color="primary"
            size="md"
            disabled={loading}
            className="active:scale-[0.98] motion-reduce:transform-none"
          >
            <span className="whitespace-nowrap">{loading ? '등록 중...' : '등록'}</span>
          </Button>
        </AdminActions>
      </div>
    )}
  </NewProductLinkForm>
);

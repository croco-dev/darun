'use client';

import { NewProductLinkForm } from '@darun/products-feature';
import { Button } from '@darun/ui';
import { AdminField, AdminInput, AdminSelect, AdminActions } from '@darun/ui-admin';

type NewProductLinkSectionProps = {
  productSlug: string;
};

export const NewProductLinkSection = ({ productSlug }: NewProductLinkSectionProps) => (
  <NewProductLinkForm productSlug={productSlug}>
    {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
    {({ form }: any) => (
      <div className="flex flex-col gap-3">
        <AdminField label="표시 링크" error={form.errors.displayLink}>
          <AdminInput type="text" placeholder="ex) toss.im" {...form.getInputProps('displayLink')} />
        </AdminField>
        <AdminField label="링크" error={form.errors.link}>
          <AdminInput type="text" placeholder="ex) https://toss.im/" {...form.getInputProps('link')} />
        </AdminField>
        <AdminField label="이름" error={form.errors.title}>
          <AdminInput type="text" placeholder="ex) 공식 홈페이지" {...form.getInputProps('title')} />
        </AdminField>
        <AdminField label="아이콘" error={form.errors.iconUrl}>
          <AdminSelect {...form.getInputProps('iconUrl')}>
            <option value="">
              ex)
              https://res.cloudinary.com/dqddtkvmb/image/upload/v1709304777/images/icons/links/pvjgv9btsktstjkoarrl.svg
            </option>
            {iconData.map(icon => (
              <option key={icon.value} value={icon.value}>
                {icon.label}
              </option>
            ))}
          </AdminSelect>
        </AdminField>

        <AdminActions>
          <Button type="submit" variant="contained" color="primary" size="md">
            등록
          </Button>
        </AdminActions>
      </div>
    )}
  </NewProductLinkForm>
);

const iconData = [
  {
    value: 'https://res.cloudinary.com/dqddtkvmb/image/upload/v1709304777/images/icons/links/pvjgv9btsktstjkoarrl.svg',
    label: '지구본 아이콘 (흰색) (주 링크 용도)',
  },
  {
    value: 'https://res.cloudinary.com/dqddtkvmb/image/upload/v1709304777/images/icons/links/hdo1rx06frvuhf5q0gio.svg',
    label: '인스타그램 (그레이)',
  },
  {
    value: 'https://res.cloudinary.com/dqddtkvmb/image/upload/v1709304777/images/icons/links/i9ea1d250oskdzvu7iby.svg',
    label: 'X(Twitter) (그레이)',
  },
  {
    value: 'https://res.cloudinary.com/dqddtkvmb/image/upload/v1709304776/images/icons/links/kiezpv3buqv7w8xajhw4.svg',
    label: 'GitHub (검정)',
  },
];

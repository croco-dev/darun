'use client';

import { NewProductLinkForm } from '@darun/products-feature';
import { Button } from '@darun/ui';

type NewProductLinkSectionProps = {
  productSlug: string;
};

export const NewProductLinkSection = ({ productSlug }: NewProductLinkSectionProps) => (
  <NewProductLinkForm productSlug={productSlug}>
    {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
    {({ form }: any) => (
      <div className="flex flex-col gap-2">
        <label className="flex flex-col gap-1 text-sm font-medium text-dark-900">
          <span>표시 링크</span>
          <input
            type="text"
            className="w-full rounded-xl border border-black/10 px-3 py-2 text-sm text-dark-900 outline-none transition focus:border-dark-900"
            placeholder="ex) toss.im"
            {...form.getInputProps('displayLink')}
          />
        </label>
        <label className="flex flex-col gap-1 text-sm font-medium text-dark-900">
          <span>링크</span>
          <input
            type="text"
            className="w-full rounded-xl border border-black/10 px-3 py-2 text-sm text-dark-900 outline-none transition focus:border-dark-900"
            placeholder="ex) https://toss.im/"
            {...form.getInputProps('link')}
          />
        </label>
        <label className="flex flex-col gap-1 text-sm font-medium text-dark-900">
          <span>이름</span>
          <input
            type="text"
            className="w-full rounded-xl border border-black/10 px-3 py-2 text-sm text-dark-900 outline-none transition focus:border-dark-900"
            placeholder="ex) 공식 홈페이지"
            {...form.getInputProps('title')}
          />
        </label>
        <label className="flex flex-col gap-1 text-sm font-medium text-dark-900">
          <span>아이콘</span>
          <select
            className="w-full rounded-xl border border-black/10 px-3 py-2 text-sm text-dark-900 outline-none transition focus:border-dark-900"
            {...form.getInputProps('iconUrl')}
          >
            <option value="">
              ex)
              https://res.cloudinary.com/dqddtkvmb/image/upload/v1709304777/images/icons/links/pvjgv9btsktstjkoarrl.svg
            </option>
            {iconData.map(icon => (
              <option key={icon.value} value={icon.value}>
                {icon.label}
              </option>
            ))}
          </select>
        </label>

        <Button type="submit" variant="contained" color="secondary" size="md">
          등록
        </Button>
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

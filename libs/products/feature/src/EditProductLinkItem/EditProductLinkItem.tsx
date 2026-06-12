import { gql } from '@apollo/client';
import { bind } from '@croco/utils-structure-react';
import { Button } from '@darun/ui';
import { AdminField, AdminInput, AdminSelect, AdminActions } from '@darun/ui-admin';
import { useEditProductLinkItem } from './useEditProductLinkItem';

// eslint-disable-next-line @typescript-eslint/no-unused-expressions
gql`
  fragment EditProductLinkItem on Link {
    id
    title
    link
    displayLink
    iconUrl
  }
`;

export const EditProductLinkItem = bind(useEditProductLinkItem, ({ form, submit, loading }) => {
  return (
    <form onSubmit={form.onSubmit(submit)}>
      <div className="flex flex-col gap-2">
        <AdminField label="표시 링크">
          <AdminInput
            type="text"
            placeholder="ex) toss.im"
            key={form.key('displayLink')}
            {...form.getInputProps('displayLink')}
          />
        </AdminField>
        <AdminField label="링크">
          <AdminInput
            type="text"
            placeholder="ex) https://toss.im/"
            key={form.key('link')}
            {...form.getInputProps('link')}
          />
        </AdminField>
        <AdminField label="이름">
          <AdminInput
            type="text"
            placeholder="ex) 공식 홈페이지"
            key={form.key('title')}
            {...form.getInputProps('title')}
          />
        </AdminField>
        <AdminField label="아이콘">
          <AdminSelect key={form.key('iconUrl')} {...form.getInputProps('iconUrl')}>
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
          <Button type="submit" variant="contained" color="primary" disabled={loading}>
            저장
          </Button>
        </AdminActions>
      </div>
    </form>
  );
});

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

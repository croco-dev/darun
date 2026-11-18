'use client';

import { AdminField, AdminSelect } from '@darun/ui-admin';
import type { ComponentProps } from 'react';
import { productLinkRoleLabels } from './productLinkPresentation';

export function ProductLinkRoleField(props: ComponentProps<typeof AdminSelect>) {
  return (
    <AdminField label="링크 역할">
      <AdminSelect {...props}>
        <option value="">미분류</option>
        {Object.entries(productLinkRoleLabels).map(([role, label]) => (
          <option key={role} value={role}>
            {label.ko}
          </option>
        ))}
      </AdminSelect>
    </AdminField>
  );
}

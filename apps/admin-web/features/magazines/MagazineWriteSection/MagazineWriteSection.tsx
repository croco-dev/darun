'use client';

import { WriteMagazine } from '@darun/magazines-feature';
import { AdminPanel, AdminSection, AdminSectionBody } from '@darun/ui-admin';

export const MagazineWriteSection = () => (
  <AdminPanel>
    <AdminSection>
      <AdminSectionBody>
        <WriteMagazine />
      </AdminSectionBody>
    </AdminSection>
  </AdminPanel>
);

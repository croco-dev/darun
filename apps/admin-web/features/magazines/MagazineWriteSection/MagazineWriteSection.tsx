'use client';

import { WriteMagazine } from '@darun/magazines-feature';
import { AdminPanel, AdminSection, AdminSectionHeader, AdminSectionBody } from '@darun/ui-admin';

export const MagazineWriteSection = () => (
  <AdminPanel>
    <AdminSection>
      <AdminSectionHeader title="매거진 기본 정보 작성" />
      <AdminSectionBody>
        <WriteMagazine />
      </AdminSectionBody>
    </AdminSection>
  </AdminPanel>
);

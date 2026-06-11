'use client';

import { NewCompanyForm } from '@darun/companies-feature';
import { AdminPanel, AdminSection, AdminSectionHeader, AdminSectionBody } from '@darun/ui-admin';

export const NewCompanyFormSection = () => {
  return (
    <AdminPanel>
      <AdminSection>
        <AdminSectionHeader title="기업 등록" />
        <AdminSectionBody>
          <NewCompanyForm />
        </AdminSectionBody>
      </AdminSection>
    </AdminPanel>
  );
};

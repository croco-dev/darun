import { NewCompanyFormSection } from '@darun/admin-companies/shell';
import { AppShell, PageShell } from '../uis';

export const NewCompanyPage = () => (
  <AppShell>
    <PageShell title={'새로운 기업 추가'}>
      <NewCompanyFormSection />
    </PageShell>
  </AppShell>
);

import { NewCompanyFormSection } from '@darun/admin/src/libs/companies/shells/NewCompanyFormSection/NewCompanyFormSection';
import { AppShell, PageShell } from '@uis';

export const NewCompanyPage = () => (
  <AppShell>
    <PageShell title={'새로운 기업 추가'}>
      <NewCompanyFormSection />
    </PageShell>
  </AppShell>
);

import { NewCompanyFormSection } from '@darun/admin-companies-shell';
import { PageShell } from '@darun/ui-admin';

export default function NewCompanyPage() {
  return (
    <PageShell title={'새로운 기업 추가'}>
      <NewCompanyFormSection />
    </PageShell>
  );
}

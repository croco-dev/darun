import { PageShell } from '@darun/ui-admin';
import { NewCompanyFormSection } from '../../../features/companies/NewCompanyFormSection/NewCompanyFormSection';

export default function NewCompanyPage() {
  return (
    <PageShell title={'새로운 기업 추가'}>
      <NewCompanyFormSection />
    </PageShell>
  );
}

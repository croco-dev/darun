import { Button } from '@darun/ui';
import { PageShell, AdminEmptyState } from '@darun/ui-admin';
import { Link } from '@darun/utils-router';

export default function NotFoundPage() {
  return (
    <PageShell title={'404'}>
      <div className="flex flex-col items-center justify-center py-16">
        <AdminEmptyState
          title="페이지를 찾을 수 없습니다."
          description="주소를 다시 확인하거나 대시보드로 돌아가 주세요."
          className="min-h-0 p-0"
          action={
            <Button as={Link} href="/" variant="contained" color="primary">
              대시보드로 돌아가기
            </Button>
          }
        />
      </div>
    </PageShell>
  );
}

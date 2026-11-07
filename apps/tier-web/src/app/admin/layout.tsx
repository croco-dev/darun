import { AdminAccessRetry } from '@/components/AdminAccessRetry';
import { AdminAccessError, requireAdmin } from '@/utils/admin';

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  try {
    await requireAdmin();
  } catch (error) {
    if (!(error instanceof AdminAccessError)) throw error;
    return (
      <div role="alert" className="page-shell space-y-4 py-12 text-center">
        <h1 className="text-xl font-semibold">관리자 권한을 확인하지 못했습니다</h1>
        <p className="text-sm text-muted-foreground">잠시 후 다시 시도해 주세요.</p>
        <AdminAccessRetry />
      </div>
    );
  }

  return <div className="min-h-screen">{children}</div>;
}

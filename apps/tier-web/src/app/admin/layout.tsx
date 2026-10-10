import { requireAdmin } from '@/utils/admin';

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  await requireAdmin();

  return <div className="min-h-screen">{children}</div>;
}

import { checkIsAdmin } from '@/utils/admin';
import { createClient } from '@/utils/supabase/server';
import { isAuthSessionMissingError, type User } from '@supabase/supabase-js';
import Link from 'next/link';
import { AdminAccessRetry } from './AdminAccessRetry';
import { HeaderNav } from './HeaderNav';
import { UserMenu } from './UserMenu';

export async function Header() {
  let user: User | null = null;
  let isAdmin = false;
  let accessFailed = false;
  try {
    const supabase = await createClient();
    const { data, error } = await supabase.auth.getUser();
    if (error && !isAuthSessionMissingError(error)) throw error;
    user = data.user;
    isAdmin = await checkIsAdmin();
  } catch {
    accessFailed = true;
  }

  return (
    <header className="sticky top-0 z-50 border-b border-border bg-background/95 backdrop-blur-sm">
      <div className="page-shell flex items-center justify-between gap-4 py-3">
        <div className="flex min-w-0 items-center gap-5">
          <Link href="/" className="min-w-0 text-base font-semibold tracking-[-0.02em] text-foreground">
            다른티어
          </Link>
          <HeaderNav />
        </div>
        <UserMenu user={user} isAdmin={isAdmin} />
      </div>
      {accessFailed && (
        <div
          role="status"
          className="page-shell flex flex-wrap items-center justify-end gap-2 pb-3 text-sm text-muted-foreground"
        >
          <p>관리자 권한을 확인하지 못했습니다.</p>
          <AdminAccessRetry />
        </div>
      )}
    </header>
  );
}

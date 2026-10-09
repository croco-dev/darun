import { checkIsAdmin } from '@/utils/admin';
import { createClient } from '@/utils/supabase/server';
import Link from 'next/link';
import { HeaderNav } from './HeaderNav';
import { UserMenu } from './UserMenu';

export async function Header() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const isAdmin = await checkIsAdmin();

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
    </header>
  );
}

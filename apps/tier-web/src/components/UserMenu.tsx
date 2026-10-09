'use client';

import { logout } from '@/app/login/actions';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import type { User as SupabaseUser } from '@supabase/supabase-js';
import { LogOut, Settings, Shield } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useMemo, useState } from 'react';

interface UserMenuProps {
  user: SupabaseUser | null;
  isAdmin: boolean;
}

export function UserMenu({ user, isAdmin }: UserMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const pathname = usePathname();
  const isAuthPage = pathname.startsWith('/auth/');

  const userName = useMemo(() => user?.email?.split('@')[0] ?? '', [user?.email]);
  const initial = userName.slice(0, 1).toUpperCase() || 'D';

  if (!user) {
    if (isAuthPage) {
      return null;
    }

    return (
      <Link href="/auth/signin">
        <Button variant="outline" className="h-8 px-3 text-sm font-medium">
          로그인
        </Button>
      </Link>
    );
  }

  return (
    <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" className="h-8 gap-2 px-2.5 sm:px-3">
          <span className="flex size-5 items-center justify-center rounded-full bg-muted text-[10px] font-semibold text-foreground">
            {initial}
          </span>
          <span className="hidden max-w-20 truncate text-sm sm:block">{userName}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-64" align="end" forceMount>
        <DropdownMenuLabel className="font-normal">
          <div className="flex flex-col gap-1 px-1 py-1">
            <p className="text-sm font-medium leading-none">{userName}</p>
            <p className="text-xs leading-none text-muted-foreground">{user.email}</p>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link href="/settings" className="cursor-pointer">
            <Settings className="mr-2 h-4 w-4" />
            <span>설정</span>
          </Link>
        </DropdownMenuItem>
        {isAdmin && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <Link href="/admin" className="cursor-pointer">
                <Shield className="mr-2 h-4 w-4" />
                <span>관리자 페이지</span>
              </Link>
            </DropdownMenuItem>
          </>
        )}
        <DropdownMenuSeparator />
        <DropdownMenuItem
          variant="destructive"
          className="cursor-pointer"
          onClick={async () => {
            await logout();
            setIsOpen(false);
          }}
        >
          <LogOut className="mr-2 h-4 w-4" />
          <span>로그아웃</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

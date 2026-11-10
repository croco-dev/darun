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
import { useMemo, useRef, useState } from 'react';

interface UserMenuProps {
  user: SupabaseUser | null;
  isAdmin: boolean;
}

export function UserMenu({ user, isAdmin }: UserMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [logoutError, setLogoutError] = useState<string>();
  const logoutInFlight = useRef(false);
  const pathname = usePathname();
  const isAuthPage = pathname.startsWith('/auth/');

  const userName = useMemo(() => user?.email?.split('@')[0] ?? '', [user?.email]);
  const initial = userName.slice(0, 1).toUpperCase() || 'D';

  async function handleLogout() {
    if (logoutInFlight.current) return;
    logoutInFlight.current = true;
    setIsLoggingOut(true);
    setLogoutError(undefined);
    setIsOpen(false);
    try {
      const result = await logout();
      setLogoutError(result.error);
    } catch {
      setLogoutError('로그아웃하지 못했습니다. 연결을 확인한 뒤 다시 시도해 주세요.');
    } finally {
      logoutInFlight.current = false;
      setIsLoggingOut(false);
    }
  }

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
    <div className="relative shrink-0">
      <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
        <DropdownMenuTrigger asChild>
          <Button
            variant="outline"
            className="h-8 gap-2 px-2.5 sm:px-3"
            disabled={isLoggingOut}
            aria-label={`${user.email} 계정 메뉴`}
          >
            <span className="flex size-5 items-center justify-center rounded-full bg-muted text-[10px] font-semibold text-foreground">
              {initial}
            </span>
            {isLoggingOut ? (
              <output>로그아웃 중…</output>
            ) : (
              <span className="hidden max-w-20 truncate text-sm sm:block">{userName}</span>
            )}
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
            disabled={isLoggingOut}
            onSelect={() => void handleLogout()}
          >
            <LogOut className="mr-2 h-4 w-4" />
            <span>로그아웃</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      {logoutError && (
        <div
          role="alert"
          className="absolute right-0 top-full z-50 mt-2 w-72 max-w-[calc(100vw-2rem)] rounded-lg border border-destructive/40 bg-background p-3 text-sm shadow-lg"
        >
          <p>{logoutError}</p>
          <Button
            variant="outline"
            size="sm"
            className="mt-2"
            onClick={() => void handleLogout()}
            disabled={isLoggingOut}
          >
            로그아웃 다시 시도
          </Button>
        </div>
      )}
    </div>
  );
}

'use client';

import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { Menu, X } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';

const navItems = [
  { name: '랭킹', href: '/' },
  { name: '모두 보기', href: '/apps' },
  { name: '새로운 앱', href: '/new' },
  {
    name: '평가 기준',
    href: 'https://slashpage.com/croco/xjqy1g2v9dnjvm6vd54z',
    external: true,
  },
];

function isItemActive(pathname: string, href: string) {
  if (href === '/') {
    return pathname === '/';
  }

  return pathname.startsWith(href);
}

export function HeaderNav() {
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="relative">
      <nav className="hidden items-center gap-5 md:flex">
        {navItems.map(item => {
          const isActive = !item.external && isItemActive(pathname, item.href);

          return (
            <Link
              key={item.href}
              href={item.href}
              target={item.external ? '_blank' : undefined}
              rel={item.external ? 'noopener noreferrer' : undefined}
              className={cn(
                'text-sm text-muted-foreground transition-colors',
                isActive ? 'font-medium text-foreground' : 'hover:text-foreground'
              )}
              aria-current={isActive ? 'page' : undefined}
            >
              {item.name}
            </Link>
          );
        })}
      </nav>

      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="h-8 w-8 md:hidden"
        onClick={() => setIsOpen(previousState => !previousState)}
        aria-expanded={isOpen}
        aria-label={isOpen ? '메뉴 닫기' : '메뉴 열기'}
      >
        {isOpen ? <X className="size-5" /> : <Menu className="size-5" />}
      </Button>

      {isOpen && (
        <div className="absolute left-0 top-full z-50 mt-2 w-44 max-w-[calc(100vw-2rem)] rounded-[var(--radius-glass-panel)] border border-border bg-background p-1.5 shadow-[var(--glass-shadow)] md:hidden">
          <nav className="flex flex-col gap-1">
            {navItems.map(item => {
              const isActive = !item.external && isItemActive(pathname, item.href);

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  target={item.external ? '_blank' : undefined}
                  rel={item.external ? 'noopener noreferrer' : undefined}
                  className={cn(
                    'rounded-[0.65rem] px-3 py-2 text-sm text-left',
                    isActive
                      ? 'bg-accent font-medium text-foreground'
                      : 'text-muted-foreground hover:bg-accent hover:text-foreground'
                  )}
                  onClick={() => setIsOpen(false)}
                  aria-current={isActive ? 'page' : undefined}
                >
                  {item.name}
                </Link>
              );
            })}
          </nav>
        </div>
      )}
    </div>
  );
}

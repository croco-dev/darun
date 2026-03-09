'use client';

import { Logo } from '@darun/ui-admin';
import { Link } from '@darun/utils-router';

import { IconArchive, IconBuildingCommunity, IconNews } from '@tabler/icons-react';
import { usePathname } from 'next/navigation';
import { LogoutButton } from '../../features/auth/LogoutButton';
import classes from './Navbar.module.css';

const data = [
  { link: '/products', label: '서비스', icon: IconArchive },
  { link: '/companies', label: '회사 관리', icon: IconBuildingCommunity },
  { link: '/magazines', label: '매거진', icon: IconNews },
];

export function Navbar() {
  const pathname = usePathname();
  const links = data.map(item => (
    <Link
      key={item.link}
      className={classes.link}
      data-active={pathname.startsWith(item.link) || undefined}
      href={item.link}
    >
      <item.icon className={classes.linkIcon} stroke={1.5} />
      <span>{item.label}</span>
    </Link>
  ));

  return (
    <nav className={classes.navbar}>
      <div className={classes.navbarMain}>
        <div className={classes.header + ' flex justify-between'}>
          <Link href={'/'}>
            <div className={'flex items-center gap-2 px-1'}>
              <Logo size={32} />
              <span className={'text-lg font-bold text-gray-700'} style={{ textDecoration: 'none' }}>
                다른 관리자
              </span>
            </div>
          </Link>
          <code className={'font-mono font-bold text-xs bg-gray-100 px-1 py-0.5 rounded'}>
            {process.env['NODE_ENV'] === 'development' ? 'dev' : 'prod'}
          </code>
        </div>
        {links}
      </div>

      <div className={classes.footer}>
        <LogoutButton />
      </div>
    </nav>
  );
}

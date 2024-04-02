'use client';

import { Link } from '@darun/utils-router';
import { Group, Code, Flex, Text, Anchor } from '@mantine/core';
import { IconSettings, IconUser, IconArchive } from '@tabler/icons-react';
import { usePathname } from 'next/navigation';
import { LogoutButton } from '../../accounts/components/LogoutButton';
import { Logo } from '../Logo';
import classes from './Navbar.module.css';

const data = [
  { link: '/users', label: '사용자', icon: IconUser },
  { link: '/products', label: '서비스', icon: IconArchive },
  { link: '/settings', label: '추가 설정', icon: IconSettings },
];

export function Navbar() {
  const pathname = usePathname();
  const links = data.map(item => (
    <Link
      className={classes.link}
      data-active={pathname.startsWith(item.link) || undefined}
      href={item.link}
      key={item.label}
      onClick={event => {
        event.preventDefault();
      }}
    >
      <item.icon className={classes.linkIcon} stroke={1.5} />
      <span>{item.label}</span>
    </Link>
  ));

  return (
    <nav className={classes.navbar}>
      <div className={classes.navbarMain}>
        <Group className={classes.header} justify="space-between">
          <Anchor>
            <Flex align={'center'} gap={8} px={'4px'}>
              <Logo size={32} />
              <Text fz="lg" fw="bold" c={'dark.7'}>
                다른 관리자
              </Text>
            </Flex>
          </Anchor>
          <Code fw={700}>{process.env['NODE_ENV'] === 'development' ? 'dev' : 'prod'}</Code>
        </Group>
        {links}
      </div>

      <div className={classes.footer}>
        <LogoutButton />
      </div>
    </nav>
  );
}

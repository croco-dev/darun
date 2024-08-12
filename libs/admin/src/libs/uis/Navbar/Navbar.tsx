'use client';

import { Link } from '@darun/utils-router';
import { Group, Code, Flex, Text, Anchor } from '@mantine/core';
import { IconSettings, IconUser, IconArchive } from '@tabler/icons-react';
import { usePathname } from 'next/navigation';
import { LogoutButton } from '../../accounts/components/LogoutButton';
import { Logo } from '../Logo';
import classes from './Navbar.module.css';

const data = [
  { link: '/products', label: '서비스', icon: IconArchive },
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
        <Group className={classes.header} justify="space-between">
          {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
          <Anchor href={'/'} component={Link as any}>
            <Flex align={'center'} gap={8} px={'4px'}>
              <Logo size={32} />
              <Text span fz="lg" fw="bold" c={'dark.7'} style={{ textDecoration: 'none' }}>
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

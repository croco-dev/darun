import { Group, Code, Flex, Text } from '@mantine/core';
import { IconSettings, IconSwitchHorizontal, IconLogout, IconUser, IconArchive } from '@tabler/icons-react';
import { useState } from 'react';
import { Logo } from '../Logo';
import classes from './Navbar.module.css';

const data = [
  { link: '', label: '사용자', icon: IconUser },
  { link: '', label: '서비스', icon: IconArchive },
  { link: '', label: '추가 설정', icon: IconSettings },
];

export function Navbar() {
  const [active, setActive] = useState('Billing');

  const links = data.map(item => (
    <a
      className={classes.link}
      data-active={item.label === active || undefined}
      href={item.link}
      key={item.label}
      onClick={event => {
        event.preventDefault();
        setActive(item.label);
      }}
    >
      <item.icon className={classes.linkIcon} stroke={1.5} />
      <span>{item.label}</span>
    </a>
  ));

  return (
    <nav className={classes.navbar}>
      <div className={classes.navbarMain}>
        <Group className={classes.header} justify="space-between">
          <Flex align={'center'} gap={8} px={'4px'}>
            <Logo size={36} />
            <Text fz="lg" fw="medium">
              darun admin
            </Text>
          </Flex>
          <Code fw={700}>{process.env['NODE_ENV'] === 'development' ? 'dev' : 'prod'}</Code>
        </Group>
        {links}
      </div>

      <div className={classes.footer}>
        <a href="#" className={classes.link} onClick={event => event.preventDefault()}>
          <IconSwitchHorizontal className={classes.linkIcon} stroke={1.5} />
          <span>Change account</span>
        </a>

        <a href="#" className={classes.link} onClick={event => event.preventDefault()}>
          <IconLogout className={classes.linkIcon} stroke={1.5} />
          <span>Logout</span>
        </a>
      </div>
    </nav>
  );
}

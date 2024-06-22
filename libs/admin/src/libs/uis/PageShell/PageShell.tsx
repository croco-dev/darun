import { Flex, Stack, Title } from '@mantine/core';
import { ReactNode } from 'react';

type PageShellProps = {
  title?: string;
  rightSide?: ReactNode;
  children?: ReactNode;
};

export const PageShell = ({ title, rightSide, children }: PageShellProps) => (
  <Stack w="100%" p={20}>
    <Flex direction="row" justify="space-between">
      <Title size={24} order={2} style={{ fontWeight: 600 }}>
        {title}
      </Title>
      {rightSide}
    </Flex>
    {children}
  </Stack>
);

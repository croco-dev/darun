import { Link } from '@darun/utils-router';
import { Button, Group } from '@mantine/core';
import { IconPlus } from '@tabler/icons-react';
import { AppShell, PageShell } from '@uis';
import { MagazinesList } from '../magazines/shells/MagazinesList';

export const MagazineListPage = () => {
  return (
    <AppShell>
      <PageShell
        title={'다른 매거진'}
        rightSide={
          <Group gap={'8px'}>
            <Link href="/magazines/create">
              <Button rightSection={<IconPlus size={16} />} color={'dark'}>
                새로운 매거진 발행
              </Button>
            </Link>
          </Group>
        }
      >
        <MagazinesList />
      </PageShell>
    </AppShell>
  );
};

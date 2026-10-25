import { Button, Plus } from '@darun/ui';
import { PageShell } from '@darun/ui-admin';
import { Link } from '@darun/utils-router';
import { MagazinesList } from '../../features/magazines/MagazinesList/MagazinesList';

export default function MagazineListPage() {
  return (
    <PageShell
      title={'다른 매거진'}
      rightSide={
        <div className="flex gap-2">
          <Button
            as={Link}
            href="/magazines/create"
            variant="contained"
            color="primary"
            className="flex items-center gap-2"
          >
            <Plus size={16} />새 매거진 작성
          </Button>
        </div>
      }
    >
      <MagazinesList />
    </PageShell>
  );
}

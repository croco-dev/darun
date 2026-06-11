import { bind } from '@croco/utils-structure-react';
import { Button } from '@darun/ui';
import { Editor, AdminActions } from '@darun/ui-admin';
import { useEditProductDescription } from './useEditProductDescription';

export const EditProductDescription = bind(useEditProductDescription, ({ form, submit, defaultValue }) => (
  <form onSubmit={form.onSubmit(submit)}>
    <div className="flex flex-col gap-2">
      <Editor {...form.getInputProps('description')} defaultValue={defaultValue} />
    </div>

    <AdminActions>
      <Button type="submit" variant="contained" color="primary">
        저장
      </Button>
    </AdminActions>
  </form>
));

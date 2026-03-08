import { bind } from "@croco/utils-structure-react";
import { Editor } from "@darun/admin-pages-shell";
import { Button } from "@darun/ui";
import { useEditProductDescription } from "./useEditProductDescription";

export const EditProductDescription = bind(
  useEditProductDescription,
  ({ form, submit, defaultValue }) => (
    <form onSubmit={form.onSubmit(submit)}>
      <div className="flex flex-col gap-2">
        <Editor
          {...form.getInputProps("description")}
          defaultValue={defaultValue}
        />
      </div>

      <div className="mt-4 flex justify-end">
        <Button type="submit" variant="contained" color="secondary">
          저장
        </Button>
      </div>
    </form>
  ),
);

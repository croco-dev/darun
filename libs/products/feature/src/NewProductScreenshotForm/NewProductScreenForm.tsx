'use client';

import { bind } from '@darun/utils-structure-react';
import { useNewProductScreenshotForm } from './useNewProductScreenshotForm';

export const NewProductScreenForm = bind(
  useNewProductScreenshotForm,
  ({ form, submit, children, loading, isUploading, cancelUpload }) => (
    <form onSubmit={form.onSubmit(submit)}>{children({ form, loading, isUploading, cancelUpload })}</form>
  )
);

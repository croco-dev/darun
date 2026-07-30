'use client';

import { bind } from '@darun/utils-structure-react';
import { useNewProductForm } from './useNewProductForm';

export const NewProductForm = bind(useNewProductForm, ({ form, submit, children }) => (
  <form id="new-product-form" onSubmit={form.onSubmit(submit)}>
    {children({ form })}
  </form>
));

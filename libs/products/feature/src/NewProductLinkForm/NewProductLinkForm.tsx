'use client';

import { bind } from '@darun/utils-structure-react';
import { useNewProductLinkForm } from './useNewProductLinkForm';

export const NewProductLinkForm = bind(useNewProductLinkForm, ({ form, submit, children, loading }) => (
  <form onSubmit={form.onSubmit(submit)}>{children({ form, loading })}</form>
));

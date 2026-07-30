'use client';

import { bind } from '@darun/utils-structure-react';
import { useNewProductFeatureForm } from './useNewProductFeatureForm';

export const NewProductFeatureForm = bind(useNewProductFeatureForm, ({ form, submit, children, pickEmoji }) => (
  <form onSubmit={form.onSubmit(submit)}>{children({ form, pickEmoji })}</form>
));

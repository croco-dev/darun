'use client';

import { bind } from '@croco/utils-structure-react';
import { Form } from '@mantine/form';
import { useNewProductFeatureForm } from './useNewProductFeatureForm';

export const NewProductFeatureForm = bind(useNewProductFeatureForm, ({ form, submit, children }) => (
  <Form form={form} onSubmit={submit}>
    {children({ form })}
  </Form>
));

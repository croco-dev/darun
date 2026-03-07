'use client';

import { bind } from '@croco/utils-structure-react';
import { Form } from '@mantine/form';
import { useNewProductForm } from './useNewProductForm';

export const NewProductForm = bind(useNewProductForm, ({ form, submit, children }) => (
  <Form form={form} onSubmit={submit}>
    {children({ form })}
  </Form>
));

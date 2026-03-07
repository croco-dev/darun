'use client';

import { bind } from '@croco/utils-structure-react';
import { Form } from '@mantine/form';
import { useNewProductLinkForm } from './useNewProductLinkForm';

export const NewProductLinkForm = bind(useNewProductLinkForm, ({ form, submit, children }) => (
  <Form form={form} onSubmit={submit}>
    {children({ form })}
  </Form>
));

'use client';

import { bind } from '@croco/utils-structure-react';
import { Form } from '@mantine/form';
import { useNewProductAlternativeForm } from './useNewProductAlternativeForm';

export const NewProductAlternativeForm = bind(useNewProductAlternativeForm, ({ form, submit, children }) => (
  <Form form={form} onSubmit={submit}>
    {children({ form })}
  </Form>
));

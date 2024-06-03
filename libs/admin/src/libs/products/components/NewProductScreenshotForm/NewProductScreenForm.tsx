'use client';

import { bind } from '@croco/utils-structure-react';
import { Form } from '@mantine/form';
import { useNewProductScreenshotForm } from './useNewProductScreenshotForm';

export const NewProductScreenForm = bind(useNewProductScreenshotForm, ({ form, submit, children }) => (
  <Form form={form} onSubmit={submit}>
    {children({ form })}
  </Form>
));

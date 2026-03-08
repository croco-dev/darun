"use client";

import { bind } from "@croco/utils-structure-react";
import { useNewProductScreenshotForm } from "./useNewProductScreenshotForm";

export const NewProductScreenForm = bind(
  useNewProductScreenshotForm,
  ({ form, submit, children }) => (
    <form onSubmit={form.onSubmit(submit)}>{children({ form })}</form>
  ),
);

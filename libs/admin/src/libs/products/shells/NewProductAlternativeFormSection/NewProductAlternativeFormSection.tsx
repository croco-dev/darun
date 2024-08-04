'use client';

import { Button, Stack } from '@mantine/core';
import { NewProductAlternativeForm } from '../../components/NewProductAlternativeForm';
import { SearchProductField } from '../../components/SearchProductField';

type NewProductFeatureFormSectionProps = {
  productSlug: string;
};
export const NewProductAlternativeFormSection = ({ productSlug }: NewProductFeatureFormSectionProps) => (
  <NewProductAlternativeForm productSlug={productSlug}>
    {({ form }) => (
      <Stack>
        <SearchProductField onSelect={id => form.setFieldValue('productId', id ?? '')} />
        <Button type="submit" size={'md'} color={'dark'}>
          등록
        </Button>
      </Stack>
    )}
  </NewProductAlternativeForm>
);

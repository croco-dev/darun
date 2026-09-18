'use client';

import { useNavigate } from '@darun/utils-router';
import { notifications } from '@mantine/notifications';
import { ProductFlowEditor } from './ProductFlowEditor';

type NewProductFlowPageProps = {
  slug: string;
};

export function NewProductFlowPanel({ slug }: NewProductFlowPageProps) {
  const navigate = useNavigate();

  return (
    <ProductFlowEditor
      slug={slug}
      onSaved={() => {
        notifications.show({ message: '플로가 등록되었습니다.', color: 'teal' });
        navigate(`/products/${slug}`);
      }}
      onCancel={() => navigate(`/products/${slug}`)}
    />
  );
}

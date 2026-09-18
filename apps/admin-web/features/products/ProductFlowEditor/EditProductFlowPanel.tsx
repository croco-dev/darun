'use client';

import { useNavigate } from '@darun/utils-router';
import { notifications } from '@mantine/notifications';
import { ProductFlowEditor } from './ProductFlowEditor';

type EditProductFlowPanelProps = {
  slug: string;
  flowId: string;
};

export function EditProductFlowPanel({ slug, flowId }: EditProductFlowPanelProps) {
  const navigate = useNavigate();

  return (
    <ProductFlowEditor
      slug={slug}
      flowId={flowId}
      onSaved={() => {
        notifications.show({ message: '플로가 수정되었습니다.', color: 'teal' });
        navigate(`/products/${slug}`);
      }}
      onCancel={() => navigate(`/products/${slug}`)}
    />
  );
}

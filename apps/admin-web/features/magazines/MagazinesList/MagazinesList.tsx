'use client';

import { ArticleCard } from '@darun/magazines-feature';
import { AdminPanel, AdminEmptyState } from '@darun/ui-admin';
import { bind } from '@darun/utils-structure-react';
import { useMagazinesList } from './useMagazinesList';

export const MagazinesList = bind(useMagazinesList, ({ magazines }) => {
  if (!magazines || magazines.length === 0) {
    return (
      <AdminPanel className="p-8">
        <AdminEmptyState title="등록된 매거진이 없습니다." description="새로운 매거진을 발행해 보세요." />
      </AdminPanel>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {magazines.map(item => (
        <ArticleCard
          key={item.id}
          title={item.title}
          summary={item.summary ?? undefined}
          author={item.author?.name}
          category={item.publishedAt ? '발행' : '미발행'}
          date={item.publishedAt ? new Date(item.publishedAt) : new Date(item.updatedAt)}
          thumbnailImageUri={item.backgroundImageUrl}
        />
      ))}
    </div>
  );
});

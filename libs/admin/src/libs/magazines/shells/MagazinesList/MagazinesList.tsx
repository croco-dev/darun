'use client';

import { bind } from '@croco/utils-structure-react';
import { Stack } from '@mantine/core';
import { ArticleCard } from '../../components/ArticleCard';
import { useMagazinesList } from './useMagazinesList';

export const MagazinesList = bind(useMagazinesList, ({ data, isError, isLoading }) => {
  if (isLoading) {
    return <>로딩 중...</>;
  }

  if (isError) {
    return <>오류 발생~~ 개발자도구 열고 해당 메세지 관리자에게 보내주세요~~</>;
  }

  if (!data || data.length === 0) {
    return <>글이 없습니다 ㅠㅠ</>;
  }

  return (
    <Stack>
      {data.map((item, i) => (
        <ArticleCard
          key={item.id}
          title={item.title}
          description={item.description ?? undefined}
          author={'저자 미구현이슈'}
          category={item.publishedAt ? '발행' : '미발행'}
          date={item.publishedAt ? new Date(item.publishedAt) : new Date(item.updatedAt)}
          thumbnailImageUri={item.backgroundImageUrl}
        />
      ))}
    </Stack>
  );
});

'use client';

import { bind } from '@croco/utils-structure-react';
import { Group, Text } from '@mantine/core';
import { useProductCompanyInfo } from './useProductCompanyInfo';

function formatStartAt(startAt: unknown) {
  if (!startAt) {
    return '-';
  }

  if (typeof startAt !== 'string' && typeof startAt !== 'number' && !(startAt instanceof Date)) {
    return '-';
  }

  const date = startAt instanceof Date ? startAt : new Date(startAt);

  if (Number.isNaN(date.getTime())) {
    return '-';
  }

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');

  return `${year}. ${month}. ${day}`;
}

export const ProductCompanyInfo = bind(useProductCompanyInfo, ({ company }) => {
  if (!company) {
    return <div>회사 정보 없음</div>;
  }

  return (
    <div>
      <Group wrap="nowrap">
        <div>
          <Text fz="xs" tt="uppercase" fw={700} c="dimmed">
            기본 정보
          </Text>

          <Text fz="lg" fw={500}>
            {company.name}
          </Text>

          <Group wrap="nowrap" gap={10} mt={3}>
            <Text fz="xs" c="dark" fw="700">
              유형
            </Text>
            <Text fz="xs" c="dimmed">
              {company.type}
            </Text>
          </Group>

          <Group wrap="nowrap" gap={10} mt={3}>
            <Text fz="xs" c="dark" fw="700">
              주소
            </Text>
            <Text fz="xs" c="dimmed">
              {company.address}
            </Text>
          </Group>

          <Group wrap="nowrap" gap={10} mt={3}>
            <Text fz="xs" c="dark" fw="700">
              상장일
            </Text>
            <Text fz="xs" c="dimmed">
              {formatStartAt(company.startAt)}
            </Text>
          </Group>
        </div>
      </Group>
    </div>
  );
});

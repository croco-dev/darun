'use client';

import { gql } from '@apollo/client';
import { CombinedGraphQLErrors } from '@apollo/client/errors';
import { useMutation, useQuery } from '@apollo/client/react';
import {
  MAX_PRODUCT_USAGE_CONDITIONS,
  MAX_PRODUCT_USAGE_EXCERPT_LENGTH,
  MAX_PRODUCT_USAGE_SOURCE_URL_LENGTH,
  MAX_PRODUCT_USAGE_STATEMENT_LENGTH,
} from '@darun/products-domain/info';
import {
  AdminProductUsageConditionsDocument,
  SaveAdminProductUsageConditionsDocument,
  type AdminProductUsageConditionsQuery,
} from '@darun/provider-graphql';
import { Button } from '@darun/ui';
import {
  AdminActions,
  AdminEmptyState,
  AdminField,
  AdminInput,
  AdminLoadingState,
  AdminModal,
  AdminTextarea,
} from '@darun/ui-admin';
import { notifications } from '@mantine/notifications';
import { useRef, useState, type FormEvent } from 'react';

gql`
  query AdminProductUsageConditions($slug: String!) {
    adminProductUsageConditions(slug: $slug) {
      productId
      revision
      items {
        statement
        sourceUrl
        excerpt
        checkedOn
      }
    }
  }

  mutation SaveAdminProductUsageConditions($input: SaveAdminProductUsageConditionsInput!) {
    saveAdminProductUsageConditions(input: $input) {
      revision
    }
  }
`;

type SavedConditions = NonNullable<AdminProductUsageConditionsQuery['adminProductUsageConditions']>;
type Item = Pick<SavedConditions['items'][number], 'statement' | 'sourceUrl' | 'excerpt' | 'checkedOn'>;
const emptyItem: Item = {
  statement: '',
  sourceUrl: '',
  excerpt: '',
  checkedOn: '',
};

export function ProductUsageConditionsModal({ slug, onClose }: { slug: string; onClose: () => void }) {
  const { data, error, loading, refetch } = useQuery(AdminProductUsageConditionsDocument, {
    variables: { slug },
    fetchPolicy: 'network-only',
  });
  const [save, { loading: saving }] = useMutation(SaveAdminProductUsageConditionsDocument);
  const pending = useRef(false);
  const close = () => {
    if (!pending.current) onClose();
  };
  const refresh = () => {
    void refetch().catch(() => {});
  };
  const conditions = data?.adminProductUsageConditions;

  return (
    <AdminModal opened onClose={close} title="사용 조건 편집" maxWidth="max-w-2xl">
      {loading ? (
        <AdminLoadingState title="사용 조건을 불러오는 중입니다." />
      ) : error ? (
        <div role="alert" className="space-y-3">
          <p>사용 조건을 불러오지 못했습니다.</p>
          <Button type="button" variant="base" color="secondary" onClick={refresh}>
            다시 시도
          </Button>
        </div>
      ) : conditions ? (
        <UsageConditionsForm
          key={`${conditions.productId}:${conditions.revision}`}
          conditions={conditions}
          saving={saving}
          onClose={close}
          onRefresh={refresh}
          onSave={async items => {
            if (pending.current) return;
            pending.current = true;
            try {
              await save({
                variables: {
                  input: {
                    productId: conditions.productId,
                    expectedRevision: conditions.revision,
                    items,
                  },
                },
              });
              notifications.show({
                message: '사용 조건을 저장했습니다. 다음 소개 생성부터 반영됩니다.',
                color: 'teal',
              });
              onClose();
            } finally {
              pending.current = false;
            }
          }}
        />
      ) : (
        <AdminEmptyState title="상품을 찾을 수 없습니다." />
      )}
    </AdminModal>
  );
}

function UsageConditionsForm({
  conditions,
  saving,
  onClose,
  onRefresh,
  onSave,
}: {
  conditions: SavedConditions;
  saving: boolean;
  onClose: () => void;
  onRefresh: () => void;
  onSave: (items: Item[]) => Promise<void>;
}) {
  const [rows, setRows] = useState(() =>
    conditions.items.map(({ statement, sourceUrl, excerpt, checkedOn }, id) => ({
      id,
      statement,
      sourceUrl,
      excerpt,
      checkedOn,
    }))
  );
  const nextId = useRef(rows.length);
  const [failure, setFailure] = useState<'stale' | 'invalid' | 'save' | null>(null);
  const change = (id: number, field: keyof Item, value: string) => {
    setRows(current => current.map(row => (row.id === id ? { ...row, [field]: value } : row)));
    if (failure !== 'stale') setFailure(null);
  };

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (failure === 'stale' || saving) return;
    setFailure(null);
    try {
      await onSave(
        rows.map(({ statement, sourceUrl, excerpt, checkedOn }) => ({
          statement,
          sourceUrl,
          excerpt,
          checkedOn,
        }))
      );
    } catch (error) {
      const code = CombinedGraphQLErrors.is(error) ? error.errors[0]?.extensions?.code : undefined;
      setFailure(code === 'PRODUCT_USAGE_CONDITIONS_STALE' ? 'stale' : code === 'BAD_USER_INPUT' ? 'invalid' : 'save');
    }
  };

  return (
    <form className="space-y-4" onSubmit={submit}>
      <p className="text-sm text-dark-600">
        저장한 문구는 다음 생성 후보에 그대로 들어갑니다. 소개에는 후보를 적용할 때 반영됩니다.
      </p>
      {rows.length === 0 && <p className="text-sm text-dark-600">저장할 사용 조건이 없습니다.</p>}
      {rows.map(({ id, statement, sourceUrl, excerpt, checkedOn }, index) => (
        <fieldset key={id} disabled={saving} className="min-w-0 space-y-3 rounded-lg border border-dark-200 p-3">
          <legend className="px-1 text-sm font-medium text-dark-900">사용 조건 {index + 1}</legend>
          <AdminField label="사용 조건 문장" help={`최대 ${MAX_PRODUCT_USAGE_STATEMENT_LENGTH}자`}>
            <AdminInput required value={statement} onChange={event => change(id, 'statement', event.target.value)} />
          </AdminField>
          <AdminField label="출처 URL">
            <AdminInput
              type="url"
              required
              maxLength={MAX_PRODUCT_USAGE_SOURCE_URL_LENGTH}
              value={sourceUrl}
              onChange={event => change(id, 'sourceUrl', event.target.value)}
            />
          </AdminField>
          <AdminField label="출처에서 확인한 내용" help={`최대 ${MAX_PRODUCT_USAGE_EXCERPT_LENGTH}자`}>
            <AdminTextarea
              rows={3}
              required
              value={excerpt}
              onChange={event => change(id, 'excerpt', event.target.value)}
            />
          </AdminField>
          <AdminField label="확인 날짜">
            <AdminInput
              type="date"
              required
              value={checkedOn}
              onChange={event => change(id, 'checkedOn', event.target.value)}
            />
          </AdminField>
          <Button
            type="button"
            variant="base"
            color="secondary"
            size="sm"
            aria-label={`사용 조건 ${index + 1} 제거`}
            onClick={() => setRows(current => current.filter(row => row.id !== id))}
          >
            제거
          </Button>
        </fieldset>
      ))}
      {rows.length < MAX_PRODUCT_USAGE_CONDITIONS && (
        <Button
          type="button"
          variant="base"
          color="secondary"
          size="sm"
          disabled={saving}
          onClick={() => {
            const id = nextId.current++;
            setRows(current => [...current, { ...emptyItem, id }]);
          }}
        >
          사용 조건 추가
        </Button>
      )}
      {failure && (
        <div role="alert" className="space-y-2 text-sm text-cherry-700">
          <p>
            {failure === 'stale'
              ? '다른 편집자가 사용 조건을 변경했습니다. 작성 중인 입력은 유지됩니다.'
              : failure === 'invalid'
                ? '문장과 발췌 길이, 공개 출처 URL, 확인 날짜를 확인해 주세요.'
                : '사용 조건을 저장하지 못했습니다. 다시 시도해 주세요.'}
          </p>
          {failure === 'stale' && (
            <Button type="button" variant="base" color="secondary" onClick={onRefresh}>
              입력을 버리고 최신 조건 불러오기
            </Button>
          )}
        </div>
      )}
      <AdminActions className="sticky bottom-0 border-t border-dark-200 bg-white pb-1">
        <Button type="button" variant="base" color="secondary" onClick={onClose} disabled={saving}>
          취소
        </Button>
        <Button type="submit" variant="contained" color="primary" disabled={saving || failure === 'stale'}>
          {saving ? '저장 중…' : '사용 조건 저장'}
        </Button>
      </AdminActions>
    </form>
  );
}

'use client';

import { gql } from '@apollo/client';
import { CombinedGraphQLErrors } from '@apollo/client/errors';
import { useMutation, useQuery } from '@apollo/client/react';
import { ProductAlternativeManagementDocument, SetProductAlternativeExclusionDocument } from '@darun/provider-graphql';
import { Button } from '@darun/ui';
import { AdminActions, AdminErrorState, AdminField, AdminInput, AdminLoadingState, AdminModal } from '@darun/ui-admin';
import { useId, useRef, useState } from 'react';

gql`
  query ProductAlternativeManagement($slug: String!) {
    tempProductBySlug(slug: $slug) {
      id
      alternativeManagement {
        automatic {
          id
          name
        }
        exclusions {
          alternativeProductId
          alternativeProductName
          note
        }
      }
    }
  }

  mutation SetProductAlternativeExclusion($input: SetProductAlternativeExclusionInput!, $exclusionNote: String) {
    setProductAlternativeExclusion(input: $input, exclusionNote: $exclusionNote)
  }
`;

export function ProductAlternativeManagement({ slug }: { slug: string }) {
  const { data, loading, error, refetch } = useQuery(ProductAlternativeManagementDocument, {
    variables: { slug },
    fetchPolicy: 'network-only',
  });
  const [updateExclusion] = useMutation(SetProductAlternativeExclusionDocument);
  const [draft, setDraft] = useState<{ id: string; name: string; note: string } | null>(null);
  const [pending, setPending] = useState(false);
  const saving = useRef(false);
  const [saveError, setSaveError] = useState<string>();
  const [status, setStatus] = useState('');
  const headingId = useId();
  const heading = useRef<HTMLHeadingElement>(null);
  const management = data?.tempProductBySlug?.alternativeManagement;

  async function save(id: string, excluded: boolean, note?: string) {
    if (saving.current) return;
    saving.current = true;
    setPending(true);
    setSaveError(undefined);
    setStatus('');

    try {
      await updateExclusion({
        variables: { input: { slug, alternativeProductId: id, excluded }, exclusionNote: note },
      });
      setDraft(null);
      setStatus(excluded ? '자동 대안에서 제외했습니다.' : '자동 대안 제외를 해제했습니다.');
      // Successful writes remove their trigger from the refreshed list.
      heading.current?.focus();
      await refetch().catch(() => {});
    } catch (error) {
      const conflict = CombinedGraphQLErrors.is(error)
        ? error.errors.find(item => item.extensions?.code === 'alternative-product/conflict')
        : undefined;
      setSaveError(conflict?.message ?? '저장하지 못했습니다. 다시 시도해 주세요.');
    } finally {
      saving.current = false;
      setPending(false);
    }
  }

  function closeDraft() {
    if (saving.current) return;
    setDraft(null);
    setSaveError(undefined);
  }

  return (
    <section aria-labelledby={headingId} className="flex flex-col gap-3 border-t border-dark-200 pt-4">
      <h3 id={headingId} ref={heading} tabIndex={-1} className="text-sm font-semibold text-dark-900">
        자동 추천 대안
      </h3>
      {error ? (
        <AdminErrorState
          error={error}
          action={
            <Button type="button" size="sm" onClick={() => void refetch().catch(() => {})}>
              자동 대안 다시 조회
            </Button>
          }
        />
      ) : !management ? (
        loading ? (
          <AdminLoadingState title="자동 대안을 불러오는 중..." />
        ) : null
      ) : (
        <>
          {management.automatic.length ? (
            <ul className="flex flex-col divide-y divide-dark-200">
              {management.automatic.map(product => (
                <li key={product.id} className="flex flex-wrap items-center justify-between gap-2 py-2">
                  <span className="min-w-0 break-words text-sm text-dark-900">{product.name}</span>
                  <Button
                    size="sm"
                    type="button"
                    variant="contained"
                    color="secondary"
                    disabled={pending || loading}
                    aria-label={`${product.name} 자동 대안에서 제외`}
                    onClick={() => {
                      setSaveError(undefined);
                      setDraft({ id: product.id, name: product.name, note: '' });
                    }}
                  >
                    제외
                  </Button>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-dark-600">현재 표시할 자동 대안이 없습니다.</p>
          )}
          <h3 className="text-sm font-semibold text-dark-900">제외한 자동 대안</h3>
          {management.exclusions.length ? (
            <ul className="flex flex-col divide-y divide-dark-200">
              {management.exclusions.map(exclusion => {
                const name = exclusion.alternativeProductName ?? exclusion.alternativeProductId;
                return (
                  <li key={exclusion.alternativeProductId} className="flex flex-wrap items-center gap-2 py-2">
                    <div className="min-w-0 grow break-words">
                      <p className="text-sm text-dark-900">{name}</p>
                      {exclusion.note && <p className="text-xs text-dark-600">{exclusion.note}</p>}
                    </div>
                    <Button
                      size="sm"
                      type="button"
                      variant="contained"
                      color="secondary"
                      disabled={pending || loading}
                      aria-label={`${name} 자동 대안 제외 해제`}
                      onClick={() => void save(exclusion.alternativeProductId, false)}
                    >
                      제외 해제
                    </Button>
                  </li>
                );
              })}
            </ul>
          ) : (
            <p className="text-sm text-dark-600">제외한 서비스가 없습니다.</p>
          )}
          <p role="status" className="text-sm text-dark-600 empty:hidden">
            {status}
          </p>
          {!draft && saveError && (
            <p role="alert" className="text-sm text-cherry-700">
              {saveError}
            </p>
          )}
        </>
      )}
      <AdminModal opened={Boolean(draft)} onClose={closeDraft} title="자동 대안에서 제외">
        {draft && (
          <form
            className="flex flex-col gap-4"
            onSubmit={event => {
              event.preventDefault();
              void save(draft.id, true, draft.note);
            }}
          >
            <p className="break-words text-sm text-dark-700 [word-break:keep-all]">
              {draft.name} 서비스를 이 상품의 자동 대안에서 제외합니다.
            </p>
            <AdminField label="제외 메모 (선택)">
              <AdminInput
                value={draft.note}
                maxLength={500}
                disabled={pending}
                onChange={event => setDraft({ ...draft, note: event.target.value })}
              />
            </AdminField>
            {saveError && (
              <p role="alert" className="text-sm text-cherry-700">
                {saveError}
              </p>
            )}
            <AdminActions>
              <Button type="button" variant="contained" color="secondary" disabled={pending} onClick={closeDraft}>
                취소
              </Button>
              <Button type="submit" color="primary" variant="contained" disabled={pending}>
                {pending ? '저장 중...' : '제외'}
              </Button>
            </AdminActions>
          </form>
        )}
      </AdminModal>
    </section>
  );
}

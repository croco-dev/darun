'use client';

import { gql } from '@apollo/client';
import { CombinedGraphQLErrors } from '@apollo/client/errors';
import { useMutation, useQuery } from '@apollo/client/react';
import {
  GetAdminProductCategorySelectionDocument,
  UpdateAdminProductCategoriesDocument,
} from '@darun/provider-graphql';
import { Button } from '@darun/ui';
import {
  AdminEmptyState,
  AdminErrorState,
  AdminLoadingState,
  AdminPanel,
  AdminSectionBody,
  AdminSectionHeader,
} from '@darun/ui-admin';
import { useEffect, useRef, useState } from 'react';

gql`
  query GetAdminProductCategorySelection($slug: String!) {
    adminProductCategorySelection(slug: $slug) {
      productId
      categoryIds
      categories {
        id
        slug
        labelKo
      }
    }
  }

  mutation UpdateAdminProductCategories($productId: ID!, $categoryIds: [ID!]!) {
    updateProductCategories(productId: $productId, categoryIds: $categoryIds)
  }
`;

export function ProductDetailCategorySection({ slug }: { slug: string }) {
  const variables = { slug };
  const query = GetAdminProductCategorySelectionDocument;
  const { data, loading, error, refetch } = useQuery(query, {
    variables,
    fetchPolicy: 'network-only',
  });
  const [updateCategories] = useMutation(UpdateAdminProductCategoriesDocument);
  const [draft, setDraft] = useState<Set<string> | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');
  const [saved, setSaved] = useState(false);
  const editAction = useRef<HTMLDivElement>(null);
  const categoryFields = useRef<HTMLFieldSetElement>(null);
  const restoreFocus = useRef(false);
  const editing = draft !== null;
  useEffect(() => {
    if (editing) {
      categoryFields.current?.focus();
      restoreFocus.current = true;
    } else if (restoreFocus.current) {
      editAction.current?.querySelector('button')?.focus();
      restoreFocus.current = false;
    }
  }, [editing]);
  const selection = data?.adminProductCategorySelection;
  const current = new Set(selection?.categoryIds);
  const categories = selection?.categories ?? [];
  const byId = new Map(categories.map(category => [category.id, category]));
  const missing = [...new Set([...current, ...(draft ?? [])])].filter(id => !byId.has(id));
  const label = (id: string) => byId.get(id)?.labelKo ?? `선택할 수 없는 카테고리 (${id})`;
  const changed = draft && (draft.size !== current.size || [...draft].some(id => !current.has(id)));
  const invalid = draft && missing.some(id => draft.has(id));

  function toggle(id: string, checked: boolean) {
    if (!draft) return;
    const next = new Set(draft);
    if (checked) next.add(id);
    else next.delete(id);
    setDraft(next);
  }

  async function save() {
    if (!selection || !draft || !changed || invalid || loading || error || saving) return;
    setSaveError('');
    setSaving(true);
    try {
      const { data: result } = await updateCategories({
        variables: { productId: selection.productId, categoryIds: [...draft] },
        update: (cache, { data }) => {
          if (data) {
            cache.updateQuery({ query, variables }, previous =>
              previous?.adminProductCategorySelection
                ? {
                    adminProductCategorySelection: {
                      ...previous.adminProductCategorySelection,
                      categoryIds: data.updateProductCategories,
                    },
                  }
                : previous
            );
          }
        },
      });
      if (!result) throw new Error('Missing category update result');
      setDraft(null);
      setSaved(true);
    } catch (cause) {
      if (
        CombinedGraphQLErrors.is(cause) &&
        cause.errors.some(item => item.extensions?.code === 'product/category-not-found')
      ) {
        setSaveError('선택한 카테고리를 찾을 수 없습니다. 목록을 확인하고 다시 선택해 주세요.');
        await refetch().catch(() => undefined);
      } else {
        setSaveError('카테고리를 저장하지 못했습니다. 선택한 내용을 확인하고 다시 시도해 주세요.');
      }
    } finally {
      setSaving(false);
    }
  }

  return (
    <AdminPanel>
      <AdminSectionHeader
        title="카테고리 관리"
        rightSide={
          !draft && (
            <div ref={editAction}>
              <Button
                type="button"
                variant="contained"
                color="primary"
                size="sm"
                disabled={loading || !!error || !selection}
                onClick={() => {
                  setDraft(current);
                  setSaved(false);
                  setSaveError('');
                }}
              >
                카테고리 편집
              </Button>
            </div>
          )
        }
      />
      <AdminSectionBody>
        <div className="space-y-4">
          {error && (
            <AdminErrorState
              error={error}
              action={
                <Button type="button" size="sm" onClick={() => void refetch().catch(() => undefined)}>
                  다시 시도
                </Button>
              }
            />
          )}
          {loading && <AdminLoadingState title="카테고리를 불러오는 중..." />}
          {!selection && !loading && !error && <AdminEmptyState title="상품을 찾을 수 없습니다." />}
          {selection && (
            <div className="space-y-2">
              <p className="text-sm font-medium">현재 연결된 카테고리</p>
              {current.size ? (
                <ul className="flex flex-wrap gap-x-4 gap-y-2 text-sm">
                  {[...current].map(id => {
                    const category = byId.get(id);
                    return (
                      <li key={id} className="break-all">
                        {category ? (
                          <a
                            className="underline underline-offset-4"
                            href={`https://darun.io/ko/categories/${encodeURIComponent(category.slug)}`}
                          >
                            {category.labelKo}
                          </a>
                        ) : (
                          label(id)
                        )}
                      </li>
                    );
                  })}
                </ul>
              ) : (
                <p className="text-sm text-dark-500">연결된 카테고리가 없습니다.</p>
              )}
            </div>
          )}
          {draft && (
            <form
              className="space-y-3"
              onSubmit={event => {
                event.preventDefault();
                void save();
              }}
            >
              <fieldset
                ref={categoryFields}
                tabIndex={-1}
                className="space-y-2"
                disabled={saving || loading || !!error}
              >
                <legend className="text-sm font-medium">카테고리 선택</legend>
                <div className="grid max-w-lg gap-2 sm:grid-cols-2">
                  {categories.map(category => (
                    <label key={category.id} className="flex items-start gap-2 text-sm">
                      <input
                        type="checkbox"
                        checked={draft.has(category.id)}
                        onChange={event => toggle(category.id, event.target.checked)}
                      />
                      {category.labelKo}
                    </label>
                  ))}
                  {missing
                    .filter(id => draft.has(id))
                    .map(id => (
                      <label key={id} className="flex items-start gap-2 break-all text-sm">
                        <input type="checkbox" checked onChange={() => toggle(id, false)} />
                        {label(id)}
                      </label>
                    ))}
                </div>
                {categories.length === 0 && <p className="text-sm text-dark-500">선택 가능한 카테고리가 없습니다.</p>}
              </fieldset>
              <div className="space-y-1 text-sm">
                <p className="font-medium">저장 후 카테고리</p>
                <p className="break-words">{draft.size ? [...draft].map(label).join(', ') : '연결된 카테고리 없음'}</p>
              </div>
              {invalid && (
                <p className="text-sm" role="status">
                  선택할 수 없는 카테고리를 해제해 주세요.
                </p>
              )}
              {saveError && (
                <p className="text-sm" role="alert">
                  {saveError}
                </p>
              )}
              <div className="flex flex-wrap gap-2">
                <Button
                  type="submit"
                  variant="contained"
                  color="primary"
                  size="sm"
                  disabled={!changed || !!invalid || saving || loading || !!error}
                >
                  {saving ? '저장 중…' : '카테고리 저장'}
                </Button>
                <Button
                  type="button"
                  variant="base"
                  color="secondary"
                  size="sm"
                  disabled={saving}
                  onClick={() => setDraft(null)}
                >
                  취소
                </Button>
              </div>
            </form>
          )}
          {saved && (
            <p role="status" className="text-sm">
              카테고리를 저장했습니다.
            </p>
          )}
        </div>
      </AdminSectionBody>
    </AdminPanel>
  );
}

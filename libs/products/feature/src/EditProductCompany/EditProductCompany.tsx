'use client';

import { Button } from '@darun/ui';
import {
  AdminField,
  AdminSelect,
  AdminActions,
  AdminInput,
  AdminLoadingState,
  AdminErrorState,
  AdminEmptyState,
} from '@darun/ui-admin';
import { bind } from '@darun/utils-structure-react';
import { useEditProductCompany, type UseEditProductCompanyProps } from './useEditProductCompany';

const EditProductCompanyForm = bind(
  useEditProductCompany,
  ({
    form,
    handleSubmit,
    handleCancel,
    companies,
    searchValue,
    handleSearchChange,
    loading,
    isLoading,
    isReady,
    isNotFound,
    error,
    retry,
  }) => {
    const isBusy = loading || !isReady;
    return (
      <form onSubmit={form.onSubmit(handleSubmit)}>
        {isLoading ? (
          <AdminLoadingState title="연결된 회사를 불러오는 중..." />
        ) : error ? (
          <AdminErrorState
            error={error}
            action={
              <Button type="button" onClick={retry}>
                다시 시도
              </Button>
            }
          />
        ) : isNotFound ? (
          <AdminEmptyState title="상품을 찾을 수 없습니다." />
        ) : null}
        <div className="flex flex-col gap-3">
          <AdminField label="회사" error={form.errors.companyId}>
            <div className="flex flex-col gap-2">
              <AdminInput
                placeholder="회사 이름을 검색하세요"
                value={searchValue}
                disabled={isBusy}
                onChange={e => handleSearchChange(e.target.value)}
              />
              <AdminSelect
                aria-label="연결할 회사"
                key={form.key('companyId')}
                disabled={isBusy}
                {...form.getInputProps('companyId')}
              >
                <option value="">선택하세요</option>
                {companies.map(company => (
                  <option key={company.value} value={company.value}>
                    {company.label}
                  </option>
                ))}
              </AdminSelect>
            </div>
          </AdminField>
        </div>

        <AdminActions>
          <Button
            type="button"
            variant="contained"
            color="secondary"
            onClick={handleCancel}
            disabled={loading}
            className="active:scale-[0.98] motion-reduce:transform-none"
          >
            취소
          </Button>
          <Button
            type="submit"
            variant="contained"
            color="primary"
            disabled={isBusy}
            className="active:scale-[0.98] motion-reduce:transform-none"
          >
            {loading ? '저장 중...' : '저장'}
          </Button>
        </AdminActions>
      </form>
    );
  }
);

export function EditProductCompany(props: UseEditProductCompanyProps) {
  return <EditProductCompanyForm key={props.slug} {...props} />;
}

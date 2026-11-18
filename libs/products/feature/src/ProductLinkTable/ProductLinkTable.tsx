'use client';

import { gql } from '@apollo/client';
import type { EditProductLinkItemFragment } from '@darun/provider-graphql';
import { Button, cn, Globe, Link2, Pencil } from '@darun/ui';
import { AdminEmptyState, AdminErrorState, AdminLoadingState } from '@darun/ui-admin';
import { bind } from '@darun/utils-structure-react';
import { useState } from 'react';
import { EditProductLinkItem } from '../EditProductLinkItem';
import { getProductLinkLabel, productLinkRoleLabels } from '../productLinkPresentation';
import { useProductLinkTable } from './useProductLinkTable';

gql`
  fragment ProductLinkTable on Product {
    links {
      ...EditProductLinkItem
    }
  }
`;

type ProductLinkRowProps = {
  link: EditProductLinkItemFragment;
  onEdit: (link: EditProductLinkItemFragment) => void;
};

function LinkIcon({ iconUrl, role, isPrimary }: Pick<EditProductLinkItemFragment, 'iconUrl' | 'role' | 'isPrimary'>) {
  const [hasError, setHasError] = useState(false);
  const [prevIconUrl, setPrevIconUrl] = useState(iconUrl);

  if (iconUrl !== prevIconUrl) {
    setPrevIconUrl(iconUrl);
    setHasError(false);
  }

  if (role === 'official') {
    return (
      <Globe
        className={cn('h-5 w-5 stroke-[2] shrink-0', isPrimary ? 'text-white' : 'text-dark-800')}
        aria-hidden="true"
      />
    );
  }

  if (!iconUrl || hasError) {
    return <Link2 className={cn('h-5 w-5 shrink-0', isPrimary ? 'text-white' : 'text-dark-500')} aria-hidden="true" />;
  }

  return (
    <img src={iconUrl} alt="" loading="lazy" onError={() => setHasError(true)} className="h-6 w-6 object-contain" />
  );
}

function ProductLinkRow({ link, onEdit }: ProductLinkRowProps) {
  const label = getProductLinkLabel(link);
  const roleLabel = link.role ? productLinkRoleLabels[link.role].ko : '미분류';
  return (
    <tr className="border-b border-dark-200 hover:bg-surface-100 transition last:border-b-0">
      <td className="border-r border-dark-200 px-4 py-3">
        <div className="flex justify-center">
          <div
            className={cn(
              'flex items-center justify-center rounded-xl p-2 text-center h-10 w-10 shrink-0 border',
              link.isPrimary ? 'bg-black border-black text-white' : 'bg-white border-dark-200 text-dark-800'
            )}
          >
            <LinkIcon iconUrl={link.iconUrl} role={link.role} isPrimary={link.isPrimary} />
          </div>
        </div>
      </td>
      <td className="border-r border-dark-200 px-4 py-3">
        <div className="truncate text-sm font-medium text-dark-900" title={label}>
          {label}
        </div>
        {label !== roleLabel && <div className="text-xs text-dark-500">{roleLabel}</div>}
      </td>
      <td className="border-r border-dark-200 px-4 py-3">
        <div className="truncate text-sm text-dark-900">
          {link.link?.startsWith('http://') || link.link?.startsWith('https://') ? (
            <a
              href={link.link}
              target="_blank"
              rel="noopener noreferrer"
              className="hover:underline text-primary-700 hover:text-primary-800"
              title={`${link.displayLink} (${link.link})`}
            >
              {link.displayLink} ({link.link})
            </a>
          ) : (
            <span className="text-dark-500" title={link.link}>
              {link.displayLink || link.link || '-'}
            </span>
          )}
        </div>
      </td>
      <td className="border-r border-dark-200 px-4 py-3 text-center">
        {link.isPrimary ? (
          <span className="inline-flex items-center rounded-full bg-primary-50 px-2.5 py-0.5 text-xs font-medium text-primary-700">
            대표 링크
          </span>
        ) : (
          <span className="inline-flex items-center rounded-full bg-surface-100 px-2.5 py-0.5 text-xs font-medium text-dark-500">
            일반
          </span>
        )}
      </td>
      <td className="px-4 py-3">
        <div className="flex justify-end gap-0">
          <Button
            type="button"
            variant="base"
            size="sm"
            onClick={() => onEdit(link)}
            className="shrink-0 active:scale-[0.98] motion-reduce:transform-none"
          >
            <span className="inline-flex items-center gap-2">
              <Pencil className="h-4 w-4 shrink-0" aria-hidden="true" />
              정보 수정
            </span>
          </Button>
        </div>
      </td>
    </tr>
  );
}

function ProductLinkRows({
  links,
  loading,
  error,
  refreshLinks,
  editLink,
}: Pick<ReturnType<typeof useProductLinkTable>, 'links' | 'loading' | 'error' | 'refreshLinks' | 'editLink'>) {
  if (loading) {
    return <AdminLoadingState />;
  }

  if (error) {
    return (
      <AdminErrorState
        error={error}
        action={
          <Button
            type="button"
            onClick={refreshLinks}
            variant="contained"
            color="primary"
            className="active:scale-[0.98] motion-reduce:transform-none"
          >
            다시 시도
          </Button>
        }
      />
    );
  }

  if (!links || links.length === 0) {
    return <AdminEmptyState title="등록된 링크가 없습니다." description="우측 상단 버튼으로 등록해보세요." />;
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse table-fixed" aria-label="링크 목록">
        <thead className="bg-surface-100 text-left text-dark-900">
          <tr>
            <th className="border-b border-r border-dark-200 px-4 py-3 text-sm font-medium text-dark-900 text-center w-[80px]">
              아이콘
            </th>
            <th className="border-b border-r border-dark-200 px-4 py-3 text-sm font-medium text-dark-900 w-[150px]">
              이름
            </th>
            <th className="border-b border-r border-dark-200 px-4 py-3 text-sm font-medium text-dark-900">링크</th>
            <th className="border-b border-r border-dark-200 px-4 py-3 text-sm font-medium text-dark-900 text-center w-[120px]">
              대표 링크
            </th>
            <th className="border-b border-dark-200 px-4 py-3 text-sm font-medium text-dark-900 last:border-r-0 w-[120px]">
              <span className="sr-only">수정</span>
            </th>
          </tr>
        </thead>
        <tbody className="bg-white">
          {links.map(link => (
            <ProductLinkRow key={link.id} link={link} onEdit={editLink} />
          ))}
        </tbody>
      </table>
    </div>
  );
}

export const ProductLinkTable = bind(
  useProductLinkTable,
  ({ links, loading, error, refreshLinks, editLink, closeEditModal, finishEdit, link, slug }) => (
    <>
      <ProductLinkRows links={links} loading={loading} error={error} refreshLinks={refreshLinks} editLink={editLink} />
      {link && (
        <EditProductLinkItem slug={slug} link={link} links={links} onSubmit={finishEdit} onCancel={closeEditModal} />
      )}
    </>
  )
);

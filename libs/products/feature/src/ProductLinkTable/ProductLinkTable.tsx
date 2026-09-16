'use client';

import { gql } from '@apollo/client';
import { EditProductLinkItemFragment, EditProductLinkItemFragmentDoc, useFragment } from '@darun/provider-graphql';
import { Button, cn } from '@darun/ui';
import { AdminEmptyState, AdminErrorState, AdminLoadingState, AdminModal } from '@darun/ui-admin';
import { bind } from '@darun/utils-structure-react';
import { Link2, Pencil } from 'lucide-react';
import { useState } from 'react';
import { EditProductLinkItem } from '../EditProductLinkItem';
import { useProductLinkTable } from './useProductLinkTable';

// eslint-disable-next-line @typescript-eslint/no-unused-expressions
gql`
  fragment ProductLinkTable on Product {
    links {
      id
      isPrimary
      ...EditProductLinkItem
    }
  }
`;

type ProductLinkTableLinkRef = {
  id: string;
  isPrimary: boolean;
  ' $fragmentRefs'?: { EditProductLinkItemFragment: EditProductLinkItemFragment };
};

type ProductLinkRowProps = {
  linkRef: ProductLinkTableLinkRef;
  onEdit: (link: EditProductLinkItemFragment) => void;
};

function LinkIcon({ iconUrl, title, isPrimary }: { iconUrl?: string; title: string; isPrimary: boolean }) {
  const [hasError, setHasError] = useState(false);
  const [prevIconUrl, setPrevIconUrl] = useState(iconUrl);

  if (iconUrl !== prevIconUrl) {
    setPrevIconUrl(iconUrl);
    setHasError(false);
  }

  if (!iconUrl || hasError) {
    return <Link2 className={cn('h-5 w-5', isPrimary ? 'text-white' : 'text-dark-500')} />;
  }

  return (
    <img
      src={iconUrl}
      alt={`${title} 아이콘`}
      loading="lazy"
      onError={() => setHasError(true)}
      className="h-6 w-6 object-contain"
    />
  );
}

function ProductLinkRow({ linkRef, onEdit }: ProductLinkRowProps) {
  const link = useFragment(EditProductLinkItemFragmentDoc, linkRef);

  return (
    <tr className="border-b border-dark-200 hover:bg-surface-100 transition last:border-b-0">
      <td className="border-r border-dark-200 px-4 py-3">
        <div className="flex justify-center">
          <div
            className={cn(
              'flex items-center justify-center rounded-xl p-2 text-center h-10 w-10 shrink-0 border',
              linkRef.isPrimary ? 'bg-black border-black text-white' : 'bg-white border-dark-200 text-dark-800'
            )}
          >
            <LinkIcon iconUrl={link.iconUrl} title={link.title} isPrimary={linkRef.isPrimary} />
          </div>
        </div>
      </td>
      <td className="border-r border-dark-200 px-4 py-3">
        <div className="truncate text-sm font-medium text-dark-900" title={link.title}>
          {link.title}
        </div>
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
        {linkRef.isPrimary ? (
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
          <Button type="button" variant="base" size="sm" onClick={() => onEdit(link)} className="shrink-0">
            <span className="inline-flex items-center gap-2">
              <Pencil className="h-4 w-4" />
              정보 수정
            </span>
          </Button>
        </div>
      </td>
    </tr>
  );
}

export const ProductLinkTable = bind(
  useProductLinkTable,
  ({ links, loading, error, refetch, editLink, isEditModalOpened, closeEditModal, link, slug }) => {
    if (loading) {
      return <AdminLoadingState />;
    }

    if (error) {
      return (
        <AdminErrorState
          error={error}
          action={
            <Button type="button" onClick={() => refetch()} variant="contained" color="primary">
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
      <>
        <div className="overflow-x-auto">
          <table className="w-full border-collapse table-fixed">
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
                  주 링크 여부
                </th>
                <th className="border-b border-dark-200 px-4 py-3 text-sm font-medium text-dark-900 last:border-r-0 w-[120px]" />
              </tr>
            </thead>
            <tbody className="bg-white">
              {links.map(linkRef => (
                <ProductLinkRow key={linkRef.id} linkRef={linkRef as ProductLinkTableLinkRef} onEdit={editLink} />
              ))}
            </tbody>
          </table>
        </div>
        <AdminModal opened={isEditModalOpened} onClose={closeEditModal} title="링크 정보 수정">
          {link ? (
            <EditProductLinkItem slug={slug} link={link} onSubmit={closeEditModal} />
          ) : (
            <div className="py-4 text-center text-sm text-dark-500">
              오류가 발생했습니다. 새로고침 후 다시 시도해 주세요.
            </div>
          )}
        </AdminModal>
      </>
    );
  }
);

'use client';

import { gql } from '@apollo/client';
import { EditProductLinkItemFragment, EditProductLinkItemFragmentDoc, useFragment } from '@darun/provider-graphql';
import { Button } from '@darun/ui';
import { AdminEmptyState, AdminLoadingState } from '@darun/ui-admin';
import { bind } from '@darun/utils-structure-react';
import { Pencil } from 'lucide-react';
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

function ProductLinkRow({ linkRef, onEdit }: ProductLinkRowProps) {
  const link = useFragment(EditProductLinkItemFragmentDoc, linkRef);

  return (
    <tr className="border-b border-dark-200 hover:bg-surface-100 transition last:border-b-0">
      <td className="border-r border-dark-200 px-4 py-3">
        <div className="flex justify-center">
          <div
            className="flex items-center justify-center rounded-xl p-2 text-center h-10 w-10 shrink-0"
            style={{
              background: linkRef.isPrimary ? '#000' : '#fff',
            }}
          >
            <img src={link.iconUrl} alt={`${link.title} 아이콘`} loading="lazy" className="h-6 w-6 object-contain" />
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
          <a
            href={link.link}
            target="_blank"
            rel="noopener noreferrer"
            className="hover:underline"
            title={`${link.displayLink} (${link.link})`}
          >
            {link.displayLink} ({link.link})
          </a>
        </div>
      </td>
      <td className="border-r border-dark-200 px-4 py-3 text-center">
        <p className="text-sm font-medium text-dark-900">{linkRef.isPrimary ? '✅' : '❌'}</p>
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
  ({ links, loading, editLink, isEditModalOpened, closeEditModal, link, slug }) => {
    if (loading) {
      return <AdminLoadingState />;
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
        {isEditModalOpened && (
          <dialog open={isEditModalOpened} className="rounded-xl bg-white p-6 shadow-lg backdrop:bg-black/50 z-50">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-xl font-semibold">링크 정보 수정</h2>
              <button
                type="button"
                onClick={closeEditModal}
                className="text-dark-900 hover:text-dark-900/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-dark-900/40"
              >
                ✕
              </button>
            </div>
            {link ? (
              <EditProductLinkItem slug={slug} link={link} onSubmit={closeEditModal} />
            ) : (
              <>오류 발생. 새로고침 후 시도.</>
            )}
          </dialog>
        )}
      </>
    );
  }
);

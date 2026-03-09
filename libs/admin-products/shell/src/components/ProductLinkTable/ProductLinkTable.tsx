'use client';

import { gql } from '@apollo/client';
import { bind } from '@croco/utils-structure-react';
import { Button } from '@darun/ui';
import { Pencil } from 'lucide-react';
import { EditProductLinkItem } from '../EditProductLinkItem';
import { EditProductLinkItemFragmentDoc } from '../EditProductLinkItem/__generated__/EditProductLinkItem';
import { useProductLinkTable } from './useProductLinkTable';

export const ProductLinkTableFragmentDocument = gql`
  fragment ProductLinkTable on Product {
    links {
      id
      isPrimary
      ...EditProductLinkItem
    }
  }

  ${EditProductLinkItemFragmentDoc}
`;

export const ProductLinkTable = bind(
  useProductLinkTable,
  ({ links, loading, editLink, isEditModalOpened, closeEditModal, link, slug }) => {
    if (loading) {
      return <>로딩 중...</>;
    }

    if (!links || links.length === 0) {
      return (
        <p className="text-sm font-medium text-gray-600">등록된 링크가 없습니다. 우측 상단 버튼으로 등록해보세요.</p>
      );
    }

    return (
      <>
        <div className="overflow-x-auto">
          <table className="min-w-[300px] border-collapse">
            <thead>
              <tr>
                <th
                  className="border-b border-black/10 px-4 py-3 text-left text-sm font-medium text-dark-900"
                  style={{ width: '80px', textAlign: 'center' }}
                >
                  아이콘
                </th>
                <th className="border-b border-black/10 px-4 py-3 text-left text-sm font-medium text-dark-900">이름</th>
                <th className="border-b border-black/10 px-4 py-3 text-left text-sm font-medium text-dark-900">링크</th>
                <th className="border-b border-black/10 px-4 py-3 text-left text-sm font-medium text-dark-900">
                  주 링크 여부
                </th>
              </tr>
            </thead>
            <tbody>
              {links.map(link => (
                <tr key={link.id} className="hover:bg-gray-100 transition">
                  <td className="border-b border-black/10 px-4 py-3">
                    <div
                      className="flex items-center justify-center rounded-xl p-2 text-center"
                      style={{
                        background: link.isPrimary ? '#000' : '#fff',
                      }}
                    >
                      <img src={link.iconUrl} alt={`${link.title} 아이콘`} loading="lazy" />
                    </div>
                  </td>
                  <td className="border-b border-black/10 px-4 py-3">
                    <p className="text-sm font-medium text-dark-900">{link.title}</p>
                  </td>
                  <td className="border-b border-black/10 px-4 py-3">
                    <p className="text-sm font-medium text-dark-900">
                      <a href={link.link} target="_blank" rel="noopener noreferrer" className="hover:underline">
                        {link.displayLink} ({link.link})
                      </a>
                    </p>
                  </td>
                  <td className="border-b border-black/10 px-4 py-3">
                    <p className="text-sm font-medium text-dark-900">{link.isPrimary ? '✅' : '❌'}</p>
                  </td>
                  <td className="border-b border-black/10 px-4 py-3">
                    <div className="flex justify-end gap-0">
                      <Button type="button" variant="base" size="sm" onClick={() => editLink(link)}>
                        <span className="inline-flex items-center gap-2">
                          <Pencil className="h-4 w-4" />
                          정보 수정
                        </span>
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {isEditModalOpened && (
          <dialog open={isEditModalOpened} className="rounded-xl bg-white p-6 shadow-lg backdrop:bg-black/50">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-xl font-semibold">링크 정보 수정</h2>
              <button type="button" onClick={closeEditModal} className="text-dark-900 hover:text-dark-900/70">
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

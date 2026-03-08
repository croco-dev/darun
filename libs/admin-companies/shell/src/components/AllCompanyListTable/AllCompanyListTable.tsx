"use client";

import { bind } from "@croco/utils-structure-react";
import React from "react";
import { useAllCompanyListTable } from "./useAllCompanyListTable";

type CompanyRecord = {
  id: string;
  name: string;
  type: string;
  address: string;
  startAt?: string | Date | null;
};

function formatStartAt(startAt: unknown) {
  if (!startAt) {
    return "-";
  }

  if (
    typeof startAt !== "string" &&
    typeof startAt !== "number" &&
    !(startAt instanceof Date)
  ) {
    return "-";
  }

  const date = startAt instanceof Date ? startAt : new Date(startAt);

  if (Number.isNaN(date.getTime())) {
    return "-";
  }

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}. ${month}. ${day}`;
}

export const AllCompanyListTable = bind(
  useAllCompanyListTable,
  ({ companies, totalCount, page, handlePage }) => (
    <div className="flex flex-col gap-3">
      <div className="overflow-x-auto border border-gray-300 rounded-md">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              {dataTableColumns.map((col) => (
                <th
                  key={col.accessor}
                  className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-r border-gray-200 last:border-r-0"
                >
                  {col.title}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {(companies ?? []).map((record, index) => (
              <tr
                key={record.id}
                className={
                  index % 2 === 0
                    ? "hover:bg-gray-50"
                    : "bg-gray-50 hover:bg-gray-100"
                }
              >
                {dataTableColumns.map((col) => (
                  <td
                    key={col.accessor}
                    className="px-4 py-3 whitespace-nowrap text-sm text-gray-900 border-r border-gray-200 last:border-r-0"
                  >
                    {col.render
                      ? col.render(record)
                      : String(
                          record[col.accessor as keyof CompanyRecord] ?? "-",
                        )}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {totalCount && totalCount > 50 ? (
        <div className="flex items-center justify-between px-4 py-3 bg-white border border-gray-300 rounded-md">
          <div className="text-sm text-gray-700">
            총 {totalCount}개 중 {(page - 1) * 50 + 1}-
            {Math.min(page * 50, totalCount)}
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => handlePage(Math.max(1, page - 1))}
              disabled={page === 1}
              className="px-3 py-1 text-sm border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              이전
            </button>
            <span className="px-3 py-1 text-sm text-gray-700">{page}</span>
            <button
              onClick={() =>
                handlePage(Math.min(Math.ceil(totalCount / 50), page + 1))
              }
              disabled={page >= Math.ceil(totalCount / 50)}
              className="px-3 py-1 text-sm border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              다음
            </button>
          </div>
        </div>
      ) : null}
    </div>
  ),
);

const dataTableColumns: Array<{
  accessor: keyof CompanyRecord | "startAt";
  title: string;
  render?: (record: CompanyRecord) => React.ReactNode;
}> = [
  { accessor: "id", title: "ID" },
  { accessor: "name", title: "이름" },
  { accessor: "type", title: "유형" },
  { accessor: "address", title: "주소" },
  {
    accessor: "startAt",
    title: "설립년도",
    render: ({ startAt }) => formatStartAt(startAt),
  },
];

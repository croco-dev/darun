'use client';

import { bind } from '@croco/utils-structure-react';
import React from 'react';
import { useNewCompanyForm } from './useNewCompanyForm';

export const NewCompanyForm = bind(useNewCompanyForm, ({ form, handleSubmit }) => (
  <form onSubmit={form.onSubmit(handleSubmit)}>
    <div className="flex flex-col gap-2">
      <div>
        <label className="block text-sm font-medium mb-1">회사 이름</label>
        <input
          type="text"
          placeholder="ex) 네이버 주식회사"
          key={form.key('name')}
          {...form.getInputProps('name')}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>
      <div>
        <label className="block text-sm font-medium mb-1">유형</label>
        <input
          type="text"
          placeholder="ex) 비상장 법인"
          key={form.key('type')}
          {...form.getInputProps('type')}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>
      <div>
        <label className="block text-sm font-medium mb-1">주소</label>
        <input
          type="text"
          placeholder="ex) 서울 강남"
          key={form.key('address')}
          {...form.getInputProps('address')}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>
      <div>
        <label className="block text-sm font-medium mb-1">개업일</label>
        <input
          type="date"
          key={form.key('startAt')}
          {...form.getInputProps('startAt')}
          placeholder="눌러서 선택해주세요."
          disabled={Boolean(form.getValues().startAtIsDisabled)}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
        />
      </div>
      <div className="flex items-center gap-2">
        <input
          type="checkbox"
          key={form.key('startAtIsDisabled')}
          {...form.getInputProps('startAtIsDisabled')}
          className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
        />
        <label className="text-sm">개업일 미상 (체크 시 위 개업일은 무시됨)</label>
      </div>
    </div>

    <div className="flex justify-end mt-4">
      <button
        type="submit"
        className="px-4 py-2 bg-gray-800 text-white rounded-md hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-500"
      >
        저장
      </button>
    </div>
  </form>
));

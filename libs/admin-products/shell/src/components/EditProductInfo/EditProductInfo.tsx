"use client";

import { bind } from "@croco/utils-structure-react";
import { Button } from "@darun/ui";
import { useEditProductInfo } from "./useEditProductInfo";

export const EditProductInfo = bind(useEditProductInfo, ({ form, submit }) => (
  <form onSubmit={form.onSubmit(submit)}>
    <div className="flex flex-col gap-2">
      <label className="flex flex-col gap-1 text-sm font-medium text-dark-900">
        <span>서비스 이름</span>
        <input
          className="rounded-xl border border-black/10 px-3 py-2 text-sm text-dark-900 outline-none transition focus:border-dark-900"
          placeholder="ex) 다른"
          key={form.key("name")}
          {...form.getInputProps("name")}
        />
      </label>
      <label className="flex flex-col gap-1 text-sm font-medium text-dark-900">
        <span>서비스 요악 (summary)</span>
        <textarea
          className="min-h-28 rounded-xl border border-black/10 px-3 py-2 text-sm text-dark-900 outline-none transition focus:border-dark-900"
          placeholder="ex) 다른에서 여러가지 서비스를 비교, 분석해보세요."
          key={form.key("summary")}
          {...form.getInputProps("summary")}
        />
      </label>
    </div>

    <div className="mt-4 flex justify-end">
      <Button type="submit" variant="contained" color="secondary">
        저장
      </Button>
    </div>
  </form>
));

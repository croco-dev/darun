"use client";

import { Button } from "@darun/ui";
import { NewProductForm } from "../../components/NewProductForm";

export const NewProductFormSection = () => (
  <NewProductForm>
    {({ form }) => (
      <div className="rounded-2xl border border-black/10 bg-white shadow-sm">
        <div className="border-b border-black/10 px-6 py-4">
          <p className="font-medium text-dark-900">서비스 등록</p>
        </div>
        <div className="flex flex-col gap-3 px-6 py-5">
          <label className="flex flex-col gap-1 text-sm font-medium text-dark-900">
            <span>이름</span>
            <input
              name="name"
              form="new-product-form"
              placeholder="ex) NAVER"
              className="rounded-xl border border-black/10 px-3 py-2 text-sm text-dark-900 outline-none transition focus:border-dark-900"
              {...form.getInputProps("name")}
            />
          </label>
          <label className="flex flex-col gap-1 text-sm font-medium text-dark-900">
            <span>slug</span>
            <input
              name="slug"
              placeholder="ex) naver"
              className="rounded-xl border border-black/10 px-3 py-2 text-sm text-dark-900 outline-none transition focus:border-dark-900"
              {...form.getInputProps("slug")}
            />
          </label>
          <label className="flex flex-col gap-1 text-sm font-medium text-dark-900">
            <span>짧은 설명</span>
            <textarea
              name="summary"
              rows={4}
              placeholder="ex) 국내 검색 엔진 1위 기업. 포털 사이트로도 유명하다. 네이버 검색, 뉴스, 지도, 카페, 블로그 서비스를 제공하고 있으며, 네이버 웨일, 네이버 클라우드, 네이버 페이 등 다양한 서비스를 운영하고 있습니다."
              className="min-h-28 rounded-xl border border-black/10 px-3 py-2 text-sm text-dark-900 outline-none transition focus:border-dark-900"
              {...form.getInputProps("summary")}
            />
          </label>
          <label className="flex flex-col gap-1 text-sm font-medium text-dark-900">
            <span>로고</span>
            <input
              name="file"
              type="file"
              accept="image/png,image/jpeg,image/webp"
              className="rounded-xl border border-black/10 px-3 py-2 text-sm text-dark-900 file:mr-3 file:rounded-lg file:border-0 file:bg-black/5 file:px-3 file:py-1.5 file:text-sm file:font-medium"
              onChange={(event) =>
                form
                  .getInputProps("file")
                  .onChange(event.currentTarget.files?.[0] ?? undefined)
              }
            />
          </label>
          <Button type="submit" size="md" variant="contained" color="secondary">
            등록
          </Button>
        </div>
      </div>
    )}
  </NewProductForm>
);

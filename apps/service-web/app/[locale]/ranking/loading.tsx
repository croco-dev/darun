import { SectionWrapper } from "@darun/ui";
import { Layout } from "@darun/ui-layout";

export default function Loading() {
  return (
    <Layout>
      <main
        className="flex w-full flex-col"
        aria-busy="true"
        aria-live="polite"
        aria-label="페이지를 불러오는 중입니다"
      >
        <SectionWrapper background="white" spacing="md">
          <div className="flex flex-col gap-5">
            <div className="flex flex-col gap-2.5">
              <div className="h-7 w-48 animate-pulse rounded-lg bg-dark-100 motion-reduce:animate-none" />
              <div className="h-4 w-72 animate-pulse rounded bg-dark-100 motion-reduce:animate-none" />
            </div>
            <div className="grid w-full grid-cols-1 gap-2 md:grid-cols-2 md:gap-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <div
                  key={String(i)}
                  className="flex items-center gap-3 rounded-card-lg border border-dark-150 bg-white p-3.5 shadow-card"
                >
                  <div className="h-8 w-8 shrink-0 animate-pulse rounded-lg bg-dark-100 motion-reduce:animate-none" />
                  <div className="flex w-full gap-3 overflow-hidden animate-pulse motion-reduce:animate-none">
                    <div className="h-14 w-14 shrink-0 rounded-xl bg-dark-100" />
                    <div className="flex min-w-0 flex-1 flex-col gap-2 overflow-hidden">
                      <div className="h-5 w-32 rounded bg-dark-100" />
                      <div className="h-4 w-48 rounded bg-dark-100" />
                      <div className="h-5 w-14 rounded-chip bg-dark-100" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </SectionWrapper>
      </main>
    </Layout>
  );
}

'use client';

export const SearchProductListSkeleton = () => {
  return (
    <div className="flex flex-col gap-5">
      {Array.from({ length: 5 }).map((_, index) => (
        <div key={String(index)}>
          <div className="bg-white rounded-card border border-dark-200 p-4 shadow-card">
            <div className="flex w-full flex-col gap-3">
              <div className="flex flex-row animate-pulse motion-reduce:animate-none">
                <div className="h-[56px] w-[56px] rounded-xl bg-dark-100" />
                <div className="flex min-w-0 flex-col gap-1 overflow-hidden ml-3">
                  <div className="h-[18px] w-[200px] rounded bg-dark-100" />
                  <div className="h-[14px] w-[300px] rounded bg-dark-100" />
                  <div className="flex items-center gap-1 mt-1">
                    <div className="h-[24px] w-[60px] rounded-full bg-dark-100" />
                    <div className="h-[24px] w-[60px] rounded-full bg-dark-100" />
                  </div>
                </div>
              </div>
              <div className="my-[2px] h-px w-full bg-dark-100" />
              <div className="flex flex-col gap-3 animate-pulse motion-reduce:animate-none">
                <div className="flex w-fit flex-col gap-1">
                  <div className="h-[16px] w-[100px] rounded bg-dark-100" />
                  <div className="h-[2px] w-[100px] bg-dark-400" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="h-[60px] rounded bg-dark-100" />
                  <div className="h-[60px] rounded bg-dark-100" />
                  <div className="h-[60px] rounded bg-dark-100" />
                  <div className="h-[60px] rounded bg-dark-100" />
                </div>
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

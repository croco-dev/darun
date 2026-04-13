import { ContentArea } from '@darun/ui';
import { Layout } from '@darun/ui-layout';

const Skeleton = ({
  width = '100%',
  height = '20px',
  radius = '4px',
  className = '',
}: {
  width?: string | number;
  height?: string | number;
  radius?: string | number;
  className?: string;
}) => (
  <div
    aria-hidden="true"
    className={`${className} bg-gradient-to-r from-dark-100 via-dark-200 to-dark-100 animate-pulse`}
    style={{
      width: typeof width === 'number' ? `${width}px` : width,
      height: typeof height === 'number' ? `${height}px` : height,
      borderRadius: typeof radius === 'number' ? `${radius}px` : radius,
    }}
  />
);

export default function Loading() {
  return (
    <Layout>
      <div className="flex flex-col">
        <main
          className="flex w-full flex-col"
          aria-busy="true"
          aria-live="polite"
          aria-label="페이지를 불러오는 중입니다"
        >
          <ContentArea>
            <div className="flex flex-col py-3">
              {/* Magazine Title Skeleton */}
              <div data-testid="skel-magazine-title" className="mb-6 flex flex-col gap-3">
                <Skeleton width="80%" height={36} radius="4px" />
                <Skeleton width="60%" height={20} radius="4px" />
              </div>

              {/* Magazine Meta Skeleton */}
              <div data-testid="skel-magazine-meta" className="mb-6 flex items-center gap-3">
                <Skeleton width={40} height={40} radius="50%" />
                <div className="flex flex-col gap-1">
                  <Skeleton width={120} height={16} radius="4px" />
                  <Skeleton width={100} height={14} radius="4px" />
                </div>
              </div>

              {/* Magazine Body Skeleton */}
              <div data-testid="skel-magazine-body" className="flex flex-col gap-4">
                <Skeleton width="100%" height={24} radius="4px" />
                <Skeleton width="100%" height={16} radius="4px" />
                <Skeleton width="100%" height={16} radius="4px" />
                <Skeleton width="90%" height={16} radius="4px" />

                <Skeleton width="100%" height={300} radius="8px" />

                <Skeleton width="100%" height={24} radius="4px" />
                <Skeleton width="100%" height={16} radius="4px" />
                <Skeleton width="100%" height={16} radius="4px" />
                <Skeleton width="85%" height={16} radius="4px" />
                <Skeleton width="95%" height={16} radius="4px" />

                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <div className="flex flex-col gap-2">
                    <Skeleton width="100%" height={150} radius="8px" />
                  </div>
                  <div className="flex flex-col gap-2">
                    <Skeleton width="100%" height={150} radius="8px" />
                  </div>
                </div>

                <Skeleton width="100%" height={24} radius="4px" />
                <Skeleton width="100%" height={16} radius="4px" />
                <Skeleton width="100%" height={16} radius="4px" />
                <Skeleton width="80%" height={16} radius="4px" />
              </div>
            </div>
          </ContentArea>
        </main>
      </div>
    </Layout>
  );
}

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
      <main
        className="flex w-full flex-col"
        aria-busy="true"
        aria-live="polite"
        aria-label="페이지를 불러오는 중입니다"
      >
        <div className="py-6 md:py-8">
          <ContentArea>
            {/* Product Summary Skeleton */}
            <div
              data-testid="skel-product-hero"
              className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between md:gap-6"
            >
              <div className="flex items-start gap-3">
                <Skeleton width={96} height={96} radius="16px" />
                <div className="flex flex-1 flex-col gap-2">
                  <Skeleton width="180px" height={28} radius="6px" />
                  <Skeleton width="280px" height={18} radius="4px" />
                  <div className="flex gap-1.5 pt-1">
                    <Skeleton width="72px" height={22} radius="9999px" />
                    <Skeleton width="72px" height={22} radius="9999px" />
                  </div>
                </div>
              </div>
            </div>
          </ContentArea>
        </div>

        <ContentArea id="detail-content" className="flex flex-col gap-8 py-6 md:gap-10 md:py-8">
          {/* Product Description Section Skeleton */}
          <div data-testid="skel-product-desc" className="flex flex-col gap-4 md:gap-5">
            <Skeleton width="120px" height={24} radius="6px" />
            <div className="rounded-card-lg border border-dark-150 bg-white p-5 shadow-card md:p-6">
              <div className="flex flex-col gap-2.5">
                <Skeleton width="100%" height={16} radius="4px" />
                <Skeleton width="90%" height={16} radius="4px" />
                <Skeleton width="75%" height={16} radius="4px" />
              </div>
            </div>
          </div>

          {/* Product Photo Section Skeleton */}
          <div data-testid="skel-product-image" className="flex flex-col gap-4 md:gap-5">
            <Skeleton width="100px" height={24} radius="6px" />
            <div className="overflow-hidden rounded-card border border-dark-150 bg-white p-3 shadow-card">
              <Skeleton width="100%" height={220} radius="8px" />
            </div>
          </div>

          {/* Product Feature Section Skeleton */}
          <div data-testid="skel-product-feature" className="flex flex-col gap-4 md:gap-5">
            <Skeleton width="80px" height={24} radius="6px" />
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              <div className="rounded-card border border-dark-150 bg-white p-5 shadow-card">
                <div className="flex items-start gap-3">
                  <Skeleton width={40} height={40} radius="12px" />
                  <div className="flex flex-1 flex-col gap-2">
                    <Skeleton width="120px" height={20} radius="4px" />
                    <Skeleton width="100%" height={14} radius="4px" />
                  </div>
                </div>
              </div>
              <div className="rounded-card border border-dark-150 bg-white p-5 shadow-card">
                <div className="flex items-start gap-3">
                  <Skeleton width={40} height={40} radius="12px" />
                  <div className="flex flex-1 flex-col gap-2">
                    <Skeleton width="120px" height={20} radius="4px" />
                    <Skeleton width="100%" height={14} radius="4px" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </ContentArea>
      </main>
    </Layout>
  );
}

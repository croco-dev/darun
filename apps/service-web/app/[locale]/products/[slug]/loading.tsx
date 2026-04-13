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
        <div className="mb-3 flex flex-col gap-0.5">
          <ContentArea>
            <div className="flex flex-col gap-2">
              {/* Product Summary Skeleton */}
              <div data-testid="skel-product-hero" className="flex flex-col gap-3">
                <div className="flex items-start gap-4">
                  <Skeleton width={80} height={80} radius="12px" />
                  <div className="flex flex-1 flex-col gap-2">
                    <Skeleton width="60%" height={28} radius="4px" />
                    <Skeleton width="100%" height={16} radius="4px" />
                    <Skeleton width="80%" height={16} radius="4px" />
                  </div>
                </div>
              </div>
            </div>
          </ContentArea>
        </div>

        <ContentArea>
          <div className="flex flex-col">
            {/* Product Photo Section Skeleton */}
            <div data-testid="skel-product-image" className="mb-6">
              <Skeleton width="100%" height={300} radius="8px" />
            </div>

            {/* Product Description Section Skeleton */}
            <div data-testid="skel-product-desc" className="mb-6 flex flex-col gap-3">
              <Skeleton width="40%" height={24} radius="4px" />
              <Skeleton width="100%" height={16} radius="4px" />
              <Skeleton width="100%" height={16} radius="4px" />
              <Skeleton width="80%" height={16} radius="4px" />
            </div>

            {/* Product Feature Section Skeleton */}
            <div data-testid="skel-product-feature" className="flex flex-col gap-3">
              <Skeleton width="30%" height={24} radius="4px" />
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div className="flex flex-col gap-2">
                  <Skeleton width="100%" height={60} radius="8px" />
                </div>
                <div className="flex flex-col gap-2">
                  <Skeleton width="100%" height={60} radius="8px" />
                </div>
                <div className="flex flex-col gap-2">
                  <Skeleton width="100%" height={60} radius="8px" />
                </div>
                <div className="flex flex-col gap-2">
                  <Skeleton width="100%" height={60} radius="8px" />
                </div>
              </div>
            </div>
          </div>
        </ContentArea>
      </main>
    </Layout>
  );
}

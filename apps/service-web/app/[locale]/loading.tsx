import { ContentArea } from '@darun/ui';
import { Layout } from '@darun/ui-layout';

const SKELETON_ROW_KEYS = ['row-1', 'row-2', 'row-3', 'row-4'] as const;

const Skeleton = ({
  width = '100%',
  height = '20px',
  radius = '4px',
}: {
  width?: string | number;
  height?: string | number;
  radius?: string | number;
}) => (
  <div
    aria-hidden="true"
    className={'w-[' + width + '] h-[' + height + '] rounded-[' + radius + '] bg-[#f3f4f6]'}
    style={{ animation: 'pulse 1.5s ease-in-out infinite' }}
  />
);

export default function Loading() {
  return (
    <Layout>
      <main className="mt-8 w-full gap-5" aria-busy="true" aria-live="polite" aria-label="페이지를 불러오는 중입니다">
        <ContentArea>
          <div className="mb-8 flex flex-col gap-4">
            <Skeleton height={200} radius="8px" />
            <div className="flex flex-row gap-4">
              <Skeleton width="60%" height={24} />
              <Skeleton width="30%" height={24} />
            </div>
          </div>

          <div className="flex flex-col gap-4">
            {SKELETON_ROW_KEYS.map(rowKey => (
              <div key={rowKey} className="flex w-full flex-row gap-4">
                <Skeleton width={80} height={80} radius="8px" />
                <div className="flex flex-1 flex-col justify-center gap-2">
                  <Skeleton width="80%" height={20} />
                  <Skeleton width="40%" height={16} />
                </div>
              </div>
            ))}
          </div>
        </ContentArea>
      </main>
      <style>{`
        @keyframes pulse {
          0% { opacity: 1; }
          50% { opacity: 0.5; }
          100% { opacity: 1; }
        }

        @media (prefers-reduced-motion: reduce) {
          * {
            animation: none !important;
          }
        }
      `}</style>
    </Layout>
  );
}

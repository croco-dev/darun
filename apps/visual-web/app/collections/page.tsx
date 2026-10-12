import { ContentArea } from '@darun/ui';
import { Collections } from '../../features/collections/Collections';
import { VisualLayout } from '../VisualLayout';

export const metadata = {
  title: '내 컬렉션 | 다른 Visual',
  description: '이 브라우저에 저장한 화면·플로우·앱 컬렉션 모음입니다.',
};

export default function CollectionsPage() {
  return (
    <VisualLayout>
      <div className="w-full">
        <ContentArea>
          <div className="w-full py-8">
            <Collections />
          </div>
        </ContentArea>
      </div>
    </VisualLayout>
  );
}

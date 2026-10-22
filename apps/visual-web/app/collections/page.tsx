import { Collections } from '../../features/collections/Collections';
import { VisualLayout } from '../VisualLayout';

export const metadata = {
  title: '내 컬렉션 | 다른 Visual',
  description: '이 브라우저에 저장한 화면·플로우·앱 컬렉션 모음입니다.',
};

export default function CollectionsPage() {
  return (
    <VisualLayout>
      <div className="mx-auto w-full max-w-[1440px] px-4 py-5 md:px-8 md:py-8">
        <Collections />
      </div>
    </VisualLayout>
  );
}

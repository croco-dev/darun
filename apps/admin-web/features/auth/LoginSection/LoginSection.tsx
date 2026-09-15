import { LoginButton } from '../LoginButton';

export const LoginSection = () => {
  return (
    <div className="flex flex-col gap-4">
      <div className="w-full relative flex items-center py-2" role="separator" aria-label="로그인 수단">
        <div className="flex-grow border-t border-dark-200"></div>
        <span className="flex-shrink-0 mx-4 text-dark-500 text-xs font-normal">로그인 수단을 선택하세요</span>
        <div className="flex-grow border-t border-dark-200"></div>
      </div>
      <LoginButton />
    </div>
  );
};

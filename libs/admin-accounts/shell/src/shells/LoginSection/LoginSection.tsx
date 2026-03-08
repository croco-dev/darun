import { LoginButton } from "../../components/LoginButton";

export const LoginSection = () => {
  return (
    <>
      <div className="relative flex items-center py-4">
        <div className="flex-grow border-t border-gray-300"></div>
        <span className="flex-shrink-0 mx-4 text-gray-600 text-sm">
          로그인 수단을 선택하세요
        </span>
        <div className="flex-grow border-t border-gray-300"></div>
      </div>
      <div className="h-5"></div>
      <LoginButton />
    </>
  );
};

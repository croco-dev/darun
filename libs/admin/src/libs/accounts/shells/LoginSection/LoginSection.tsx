import { Divider, Space } from '@mantine/core';
import { LoginButton } from '../../components/LoginButton';

export const LoginSection = () => {
  return (
    <>
      <Divider label="로그인 수단을 선택하세요" labelPosition="center" />
      <Space h={20} />
      <LoginButton />
    </>
  );
};

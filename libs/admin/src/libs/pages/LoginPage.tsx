import { LoginSection } from '@accounts/shells';
import { Paper, Title, Container, Flex } from '@mantine/core';
import { Logo } from '@uis';

export const LoginPage = () => {
  return (
    <Flex w={'100%'} mih={'100vh'} bg={'gray.1'}>
      <Container size={400} my={56} w={340}>
        <Flex align={'center'} gap={6} justify={'center'}>
          <Logo size={24} />{' '}
          <Title fz={'16px'} fw={'extraBold'} c={'dark.6'}>
            다른 관리자
          </Title>
        </Flex>
        <Title fz={'24px'} fw={'medium'} c="dark.8" ta={'center'} mt={8}>
          로그인
        </Title>

        <Paper withBorder shadow="md" p={30} mt={30} radius="md">
          <LoginSection />
        </Paper>
      </Container>
    </Flex>
  );
};

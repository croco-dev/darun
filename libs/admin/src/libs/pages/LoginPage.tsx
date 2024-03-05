import { LoginSection } from '@accounts/shells';
import { Center, Container } from '@mantine/core';

export const LoginPage = () => {
  return (
    <Container>
      <Center maw={400} h={100}>
        <LoginSection />
      </Center>
    </Container>
  );
};

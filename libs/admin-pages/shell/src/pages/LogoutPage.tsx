import { LogoutSection } from '@darun/admin-accounts/shell';
import { Center, Container } from '@mantine/core';

export const LogoutPage = () => {
  return (
    <Container>
      <Center maw={400} h={100}>
        <LogoutSection />
      </Center>
    </Container>
  );
};

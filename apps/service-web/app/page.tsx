import { gql } from '@apollo/client';
import { Header } from '@darun/ui-layout';
import { getClient } from '@darun/utils-apollo-client/server';
import { VStack } from '@kuma-ui/core';

const userQuery = gql`
  query {
    recentProducts {
      id
      name
    }
  }
`;

export default async function Home() {
  const { data } = await getClient().query({ query: userQuery });

  return (
    <main>
      <VStack mt={8}>
        <Header />
      </VStack>
      {data.recentProducts?.map((product: any) => <div key={product.id}>{product.name}</div>)}
    </main>
  );
}

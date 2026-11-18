// @vitest-environment node

import { ApolloClient, ApolloLink, InMemoryCache } from '@apollo/client';
import { ApolloProvider } from '@apollo/client/react';
import { renderToString } from 'react-dom/server';
import { expect, it } from 'vitest';
import { GenerateProductDescriptionButton } from '../GenerateProductDescriptionButton';

it('renders the product editor entry point on the server while the AI candidate dialog is closed', () => {
  expect(typeof document).toBe('undefined');
  const client = new ApolloClient({ cache: new InMemoryCache(), link: ApolloLink.empty() });
  try {
    const html = renderToString(
      <ApolloProvider client={client}>
        <GenerateProductDescriptionButton slug="fixture-product" />
      </ApolloProvider>
    );
    expect(html).toContain('AI 소개 생성');
    expect(html).not.toContain('AI 소개 초안 검토');
  } finally {
    client.stop();
  }
});

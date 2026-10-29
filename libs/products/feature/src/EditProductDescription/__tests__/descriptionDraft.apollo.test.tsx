import { ApolloClient, ApolloLink, InMemoryCache, Observable } from '@apollo/client';
import { ApolloProvider } from '@apollo/client/react';
import { act, cleanup, renderHook, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { useGenerateProductDescriptionButton } from '../../GenerateProductDescriptionButton/useGenerateProductDescriptionButton';
import { useEditProductDescription } from '../useEditProductDescription';

vi.mock('@mantine/notifications', () => ({
  notifications: { show: vi.fn(), hide: vi.fn() },
}));
const clients: ApolloClient[] = [];
afterEach(() => {
  cleanup();
  clients.splice(0).forEach(client => client.stop());
});

function setup() {
  let savedDescription = '<p>Original saved introduction</p>';
  const operations: string[] = [];
  const job = {
    __typename: 'ProductDescriptionJob',
    id: 'candidate-1',
    productId: 'product-1',
    status: 'completed',
    message: null,
    error: null,
    candidateHtml: '<p>Accepted AI candidate</p>',
    appliedAt: null,
  };
  const product = () => ({
    __typename: 'Product',
    id: 'product-1',
    name: 'Sample',
    description: savedDescription,
  });
  const client = new ApolloClient({
    cache: new InMemoryCache(),
    link: new ApolloLink(
      operation =>
        new Observable(observer => {
          const name = operation.operationName ?? 'unknown';
          operations.push(name);
          queueMicrotask(() => {
            let data: Record<string, unknown>;
            switch (name) {
              case 'GetProductDescriptionJob':
                data = {
                  tempProductBySlug: product(),
                  productDescriptionJob: job,
                };
                break;
              case 'ApplyProductDescriptionCandidate':
                savedDescription = '<p>Accepted AI candidate</p>';
                data = {
                  applyProductDescriptionCandidate: {
                    __typename: 'ApplyProductDescriptionCandidatePayload',
                    alreadyApplied: false,
                    product: product(),
                    job: { ...job, appliedAt: '2026-10-29T09:00:00.000Z' },
                  },
                };
                break;
              case 'EditProductOnEditProductDescription':
                savedDescription = operation.variables.input.description;
                data = {
                  editProduct: {
                    __typename: 'EditProductPayload',
                    product: product(),
                  },
                };
                break;
              default:
                data = { tempProductBySlug: product() };
            }
            observer.next({ data });
            observer.complete();
          });
        })
    ),
  });
  clients.push(client);
  const wrapper = ({ children }: { children: ReactNode }) => (
    <ApolloProvider client={client}>{children}</ApolloProvider>
  );
  const hook = renderHook(
    () => ({
      editor: useEditProductDescription({ slug: 'sample' }),
      candidate: useGenerateProductDescriptionButton('sample', 'candidate-1'),
    }),
    { wrapper }
  );
  return { ...hook, operations, savedDescription: () => savedDescription };
}

describe('AI candidate application and manual description drafts on one Apollo client', () => {
  it.each([true, false])(
    'preserves dirty=%s while the actual apply hook updates and refetches the same product',
    async dirty => {
      const fixture = setup();
      await waitFor(() => {
        expect(fixture.result.current.editor.form.getValues().description).toBe('<p>Original saved introduction</p>');
        expect(fixture.result.current.candidate.candidateJob?.id).toBe('candidate-1');
      });
      if (dirty) {
        act(() =>
          fixture.result.current.editor.form.getInputProps('description').onChange('<p>Unsaved human draft</p>')
        );
      }
      await act(async () => fixture.result.current.candidate.handleApply());
      await waitFor(() => expect(fixture.result.current.candidate.isApplying).toBe(false));
      expect(fixture.savedDescription()).toBe('<p>Accepted AI candidate</p>');
      expect(
        fixture.operations.filter(name => name === 'TempProductBySlugOnEditProductDescription').length
      ).toBeGreaterThan(1);
      expect(fixture.result.current.editor.form.getValues().description).toBe(
        dirty ? '<p>Unsaved human draft</p>' : '<p>Accepted AI candidate</p>'
      );
      expect(fixture.result.current.editor.hasServerChange).toBe(dirty);
      if (dirty) {
        await act(async () => fixture.result.current.editor.submit(fixture.result.current.editor.form.getValues()));
        expect(fixture.operations).not.toContain('EditProductOnEditProductDescription');
        await act(async () => fixture.result.current.editor.overwriteWithDraft());
        expect(fixture.savedDescription()).toBe('<p>Unsaved human draft</p>');
        expect(fixture.result.current.editor.hasServerChange).toBe(false);
        expect(fixture.result.current.editor.form.isDirty()).toBe(false);
      }
    }
  );
});

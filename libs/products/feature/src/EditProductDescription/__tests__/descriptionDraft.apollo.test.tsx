import { ApolloClient, ApolloLink, InMemoryCache, Observable } from '@apollo/client';
import { ApolloProvider } from '@apollo/client/react';
import { act, cleanup, renderHook, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { createHash, webcrypto } from 'node:crypto';
import { useGenerateProductDescriptionButton } from '../../GenerateProductDescriptionButton/useGenerateProductDescriptionButton';
import { useEditProductDescription } from '../useEditProductDescription';

vi.stubGlobal('crypto', webcrypto);
const hash = (description: string) => createHash('sha256').update(description).digest('hex');

vi.mock('@mantine/notifications', () => ({
  notifications: { show: vi.fn(), hide: vi.fn() },
}));
const clients: ApolloClient[] = [];
afterEach(() => {
  cleanup();
  clients.splice(0).forEach(client => client.stop());
});

function setup(initialDescription = '<p>Original saved introduction</p>') {
  let savedDescription = initialDescription;
  let failNextRead = false;
  let waitForRead: Promise<boolean> | undefined;
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
          if (name === 'TempProductBySlugOnEditProductDescription' && waitForRead) {
            const snapshot = product();
            void waitForRead.then(fail => {
              if (fail) {
                observer.error(new Error('Earlier description read failed'));
                return;
              }
              observer.next({ data: { tempProductBySlug: snapshot } });
              observer.complete();
            });
            waitForRead = undefined;
            return;
          }
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
                if (operation.getContext().darunExpectedDescriptionHash !== hash(savedDescription)) {
                  observer.next({
                    errors: [
                      {
                        message: 'Stored description changed',
                        extensions: { code: 'DESCRIPTION_EDIT_CONFLICT' },
                      },
                    ],
                  });
                  observer.complete();
                  return;
                }
                savedDescription = operation.variables.input.description;
                data = {
                  editProduct: {
                    __typename: 'EditProductPayload',
                    product: product(),
                  },
                };
                break;
              default:
                if (failNextRead) {
                  failNextRead = false;
                  observer.error(new Error('Description read failed'));
                  return;
                }
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
  return {
    ...hook,
    operations,
    savedDescription: () => savedDescription,
    writeElsewhere: (description: string) => {
      savedDescription = description;
    },
    failNextRead: () => {
      failNextRead = true;
    },
    holdNextEditorRead: () => {
      let release!: (fail: boolean) => void;
      waitForRead = new Promise<boolean>(resolve => {
        release = resolve;
      });
      return release;
    },
  };
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

it('다른 편집자의 저장을 감지해 초안을 보존하고 최신 본문 조회를 다시 시도할 수 있다', async () => {
  const fixture = setup();
  const draft = '<p>Unsaved human draft</p>';
  const latest = '<p>Another editor saved this</p>';
  const newer = '<p>One more save</p>';
  await waitFor(() => expect(fixture.result.current.editor.descriptionReady).toBe(true));
  act(() => fixture.result.current.editor.form.getInputProps('description').onChange(draft));
  fixture.writeElsewhere(latest);
  fixture.failNextRead();

  await act(async () => fixture.result.current.editor.submit({ description: draft }));
  expect(fixture.result.current.editor.conflictRefresh).toBe('failed');
  expect(fixture.result.current.editor.descriptionReady).toBe(true);
  expect(fixture.result.current.editor.form.getValues().description).toBe(draft);
  await act(async () => fixture.result.current.editor.overwriteWithDraft());
  expect(fixture.operations.filter(name => name === 'EditProductOnEditProductDescription')).toHaveLength(1);
  expect(fixture.savedDescription()).toBe(latest);

  await act(async () => fixture.result.current.editor.refreshAfterConflict());
  expect(fixture.result.current.editor.hasServerChange).toBe(true);
  expect(fixture.result.current.editor.latestDescription).toBe(latest);
  expect(fixture.result.current.editor.form.getValues().description).toBe(draft);

  fixture.writeElsewhere(newer);
  await act(async () => fixture.result.current.editor.overwriteWithDraft());
  expect(fixture.savedDescription()).toBe(newer);
  await waitFor(() => expect(fixture.result.current.editor.latestDescription).toBe(newer));
  expect(fixture.result.current.editor.form.getValues().description).toBe(draft);

  await act(async () => fixture.result.current.editor.overwriteWithDraft());
  expect(fixture.savedDescription()).toBe(draft);
  expect(fixture.result.current.editor.hasServerChange).toBe(false);
});

it.each([false, true])(
  '빈 초안 충돌 뒤 이전 조회가 끝나도 확인한 본문으로 편집을 이어간다 (%s)',
  async failEarlierRead => {
    const fixture = setup('');
    const latest = '<p>다른 편집자가 저장한 최신 본문</p>';
    const reads = () => fixture.operations.filter(name => name === 'TempProductBySlugOnEditProductDescription').length;
    await waitFor(() => expect(fixture.result.current.editor.descriptionReady).toBe(true));
    const previousReads = reads();
    fixture.writeElsewhere('<p>이전 조회가 받은 중간 본문</p>');
    const releaseRead = fixture.holdNextEditorRead();
    act(() => fixture.result.current.editor.retryDescription());
    await waitFor(() => expect(reads()).toBe(previousReads + 1));
    try {
      fixture.writeElsewhere(latest);
      await act(async () => fixture.result.current.editor.submit({ description: '' }));
      expect(reads()).toBe(previousReads + 2);
      expect(fixture.result.current.editor.hasServerChange).toBe(true);
      expect(fixture.result.current.editor.form.getValues().description).toBe('');
      expect(fixture.result.current.editor.latestDescription).toBe(latest);
      act(() => fixture.result.current.editor.acceptLatestDescription());
      expect(fixture.result.current.editor.hasServerChange).toBe(false);
      expect(fixture.result.current.editor.form.getValues().description).toBe(latest);
    } finally {
      await act(async () => releaseRead(failEarlierRead));
    }
    expect(fixture.result.current.editor.hasServerChange).toBe(false);
    expect(fixture.result.current.editor.descriptionReady).toBe(true);
    expect(fixture.result.current.editor.form.getValues().description).toBe(latest);
    await act(async () => fixture.result.current.editor.submit({ description: '<p>최신 본문을 이어서 수정</p>' }));
    expect(fixture.savedDescription()).toBe('<p>최신 본문을 이어서 수정</p>');
  }
);

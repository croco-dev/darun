import { ApolloClient, ApolloLink, InMemoryCache, Observable } from '@apollo/client';
import { ApolloProvider } from '@apollo/client/react';
import { TempProductBySlugOnEditProductDescriptionDocument } from '@darun/provider-graphql';
import { act, cleanup, renderHook, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { createHash, webcrypto } from 'node:crypto';
import { useGenerateProductDescriptionButton } from '../../GenerateProductDescriptionButton/useGenerateProductDescriptionButton';
import { useProductDescription } from '../../ProductDescription/useProductDescription';
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

function setup(
  initialDescription = '<p>Original saved introduction</p>',
  candidateDescription = '<p>Accepted AI candidate</p>',
  initialReadSnapshot?: 'before' | 'after'
) {
  let savedDescription = initialDescription;
  let failNextRead: boolean | string = false;
  let waitForRead: Promise<boolean> | undefined;
  let snapshotOnResponse = false;
  let waitForApplyCommit: Promise<void> | undefined;
  const pendingMutationResponses = new Map<string, Promise<void>>();
  const holdNextEditorRead = (takeSnapshotOnResponse = false) => {
    let release!: (fail: boolean) => void;
    snapshotOnResponse = takeSnapshotOnResponse;
    waitForRead = new Promise<boolean>(resolve => {
      release = resolve;
    });
    return release;
  };
  const releaseInitialRead = initialReadSnapshot && holdNextEditorRead(initialReadSnapshot === 'after');
  const operations: string[] = [];
  const failedReads: string[] = [];
  const job = {
    __typename: 'ProductDescriptionJob',
    id: 'candidate-1',
    productId: 'product-1',
    status: 'completed',
    message: null,
    error: null,
    candidateHtml: candidateDescription,
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
            const snapshot = snapshotOnResponse ? undefined : product();
            void waitForRead.then(fail => {
              if (fail) {
                observer.error(new Error('Earlier description read failed'));
                return;
              }
              observer.next({ data: { tempProductBySlug: snapshot ?? product() } });
              observer.complete();
            });
            waitForRead = undefined;
            return;
          }
          const commitAndRespond = () => {
            let data: Record<string, unknown>;
            switch (name) {
              case 'GetProductDescriptionJob':
                data = {
                  tempProductBySlug: product(),
                  productDescriptionJob: job,
                };
                break;
              case 'ApplyProductDescriptionCandidate':
                savedDescription = candidateDescription;
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
                if (failNextRead === true || failNextRead === name) {
                  failNextRead = false;
                  failedReads.push(name);
                  observer.error(new Error('Description read failed'));
                  return;
                }
                data = { tempProductBySlug: product() };
            }
            const respond = () => {
              observer.next({ data });
              observer.complete();
            };
            const delay = pendingMutationResponses.get(name);
            if (delay) {
              pendingMutationResponses.delete(name);
              void delay.then(respond);
            } else {
              respond();
            }
          };
          if (name === 'ApplyProductDescriptionCandidate' && waitForApplyCommit) {
            void waitForApplyCommit.then(commitAndRespond);
            waitForApplyCommit = undefined;
          } else {
            queueMicrotask(commitAndRespond);
          }
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
      display: useProductDescription({ slug: 'sample' }),
      candidate: useGenerateProductDescriptionButton('sample', 'candidate-1'),
    }),
    { wrapper }
  );
  return {
    ...hook,
    operations,
    failedReads,
    savedDescription: () => savedDescription,
    cachedDescription: () =>
      client.readQuery({
        query: TempProductBySlugOnEditProductDescriptionDocument,
        variables: { slug: 'sample' },
      })?.tempProductBySlug?.description,
    writeElsewhere: (description: string) => {
      savedDescription = description;
    },
    failNextRead: (operationName?: string) => {
      failNextRead = operationName ?? true;
    },
    holdNextEditorRead,
    releaseInitialRead,
    holdNextApplyCommit: () => {
      let release!: () => void;
      waitForApplyCommit = new Promise<void>(resolve => {
        release = resolve;
      });
      return release;
    },
    holdNextMutationResponse: (
      operation: 'ApplyProductDescriptionCandidate' | 'EditProductOnEditProductDescription'
    ) => {
      let release!: () => void;
      pendingMutationResponses.set(
        operation,
        new Promise<void>(resolve => {
          release = resolve;
        })
      );
      return release;
    },
  };
}

describe('AI candidate application and manual description drafts on one Apollo client', () => {
  it.each([true, false])('preserves dirty=%s when the actual apply hook updates the same product', async dirty => {
    const fixture = setup();
    await waitFor(() => {
      expect(fixture.result.current.editor.form.getValues().description).toBe('<p>Original saved introduction</p>');
      expect(fixture.result.current.candidate.candidateJob?.id).toBe('candidate-1');
    });
    if (dirty) {
      act(() => fixture.result.current.editor.form.getInputProps('description').onChange('<p>Unsaved human draft</p>'));
    }
    await act(async () => fixture.result.current.candidate.handleApply());
    await waitFor(() => expect(fixture.result.current.candidate.isApplying).toBe(false));
    expect(fixture.savedDescription()).toBe('<p>Accepted AI candidate</p>');
    expect(fixture.result.current.display.description).toBe('<p>Accepted AI candidate</p>');
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
  });
});

it('공유 본문 조회가 처음 실패한 뒤 읽기 화면에서 다시 조회하면 두 화면이 복구된다', async () => {
  const description = '<p>복구된 소개</p>';
  const fixture = setup(description);
  fixture.failNextRead();
  await waitFor(() => {
    expect(fixture.result.current.display.error).toBeDefined();
    expect(fixture.result.current.editor.descriptionReady).toBe(false);
  });
  await act(async () => fixture.result.current.display.refetch());
  await waitFor(() => {
    expect(fixture.result.current.display.description).toBe(description);
    expect(fixture.result.current.display.error).toBeUndefined();
    expect(fixture.result.current.editor.form.getValues().description).toBe(description);
    expect(fixture.result.current.editor.descriptionReady).toBe(true);
  });
});

it('AI 적용 응답이 늦어도 뒤이어 저장한 수동 본문을 되돌리지 않는다', async () => {
  const fixture = setup();
  const ai = '<p>Accepted AI candidate</p>';
  const draft = '<p>직접 수정해 저장한 소개</p>';
  await waitFor(() => {
    expect(fixture.result.current.editor.descriptionReady).toBe(true);
    expect(fixture.result.current.candidate.candidateJob?.id).toBe('candidate-1');
  });

  const release = fixture.holdNextMutationResponse('ApplyProductDescriptionCandidate');
  let applying!: Promise<void>;
  act(() => {
    applying = fixture.result.current.candidate.handleApply();
  });
  await waitFor(() => expect(fixture.savedDescription()).toBe(ai));
  act(() => fixture.result.current.editor.form.getInputProps('description').onChange(draft));
  await act(async () => fixture.result.current.editor.submit({ description: draft }));
  expect(fixture.result.current.editor.latestDescription).toBe(ai);
  await act(async () => fixture.result.current.editor.overwriteWithDraft());
  expect(fixture.cachedDescription()).toBe(draft);

  fixture.failNextRead();
  await act(async () => {
    release();
    await applying;
  });
  expect(fixture.savedDescription()).toBe(draft);
  expect(fixture.cachedDescription()).toBe(draft);
  expect(fixture.result.current.display.description).toBe(draft);
  expect(fixture.result.current.editor.form.getValues().description).toBe(draft);
});

it('이전 본문과 AI 저장 응답이 다르고 확인이 실패하면 다시 조회할 수 있다', async () => {
  const original = '<p>첫 조회 시 저장된 본문</p>';
  const candidate = '<p>AI 적용 후 저장된 본문</p>';
  const fixture = setup(original, candidate, 'before');
  await waitFor(() => expect(fixture.result.current.candidate.candidateJob?.id).toBe('candidate-1'));
  expect(fixture.result.current.display.loading).toBe(true);

  const releaseApply = fixture.holdNextMutationResponse('ApplyProductDescriptionCandidate');
  let applying!: Promise<void>;
  act(() => {
    applying = fixture.result.current.candidate.handleApply();
  });
  await waitFor(() => expect(fixture.savedDescription()).toBe(candidate));
  await act(async () => fixture.releaseInitialRead!(false));
  expect(fixture.result.current.display.description).toBe(original);

  fixture.failNextRead();
  await act(async () => {
    releaseApply();
    await applying;
  });
  expect(fixture.result.current.display.description).toBe(original);
  expect(fixture.result.current.display.verificationError).toBeDefined();
  await act(async () => fixture.result.current.display.refetch());
  expect(fixture.cachedDescription()).toBe(candidate);
  expect(fixture.result.current.display.verificationError).toBeUndefined();
  expect(fixture.result.current.display.description).toBe(candidate);
  expect(fixture.result.current.editor.form.getValues().description).toBe(candidate);
});

it.each([false, true])('첫 조회에서 본 최신 외부 저장을 늦은 AI 적용 응답으로 교체하지 않는다 (%s)', async fails => {
  const original = '<p>처음 저장된 본문</p>';
  const candidate = '<p>AI로 저장한 본문</p>';
  const latest = '<p>AI 적용 뒤 다른 관리자가 저장한 본문</p>';
  const fixture = setup(original, candidate, 'after');
  await waitFor(() => expect(fixture.result.current.candidate.candidateJob?.id).toBe('candidate-1'));

  const releaseApply = fixture.holdNextMutationResponse('ApplyProductDescriptionCandidate');
  let applying!: Promise<void>;
  act(() => {
    applying = fixture.result.current.candidate.handleApply();
  });
  await waitFor(() => expect(fixture.savedDescription()).toBe(candidate));
  fixture.writeElsewhere(latest);
  await act(async () => fixture.releaseInitialRead!(false));
  expect(fixture.result.current.display.description).toBe(latest);
  const releaseVerification = fixture.holdNextEditorRead(true);
  await act(async () => {
    releaseApply();
    await applying;
  });
  expect(fixture.cachedDescription()).toBe(latest);
  await act(async () => releaseVerification(fails));
  if (fails) {
    expect(fixture.result.current.display.verificationError).toBeDefined();
    expect(fixture.cachedDescription()).toBe(latest);
    await act(async () => fixture.result.current.display.refetch());
  }
  await waitFor(() => expect(fixture.result.current.display.description).toBe(latest));
  expect(fixture.cachedDescription()).toBe(latest);
  expect(fixture.result.current.editor.form.getValues().description).toBe(latest);
});

it('수동 저장과 AI 응답이 다르면 확인 실패를 표시하고 다시 조회해 최신 본문을 표시한다', async () => {
  const original = '<p>변경 없이 저장한 본문</p>';
  const candidate = '<p>나중에 적용한 AI 본문</p>';
  const fixture = setup(original, candidate);
  await waitFor(() => {
    expect(fixture.result.current.editor.descriptionReady).toBe(true);
    expect(fixture.result.current.candidate.candidateJob?.id).toBe('candidate-1');
  });
  const releaseManual = fixture.holdNextMutationResponse('EditProductOnEditProductDescription');
  let saving!: Promise<void>;
  act(() => {
    saving = fixture.result.current.editor.submit({ description: original });
  });
  await waitFor(() => expect(fixture.operations).toContain('EditProductOnEditProductDescription'));

  const releaseApply = fixture.holdNextMutationResponse('ApplyProductDescriptionCandidate');
  let applying!: Promise<void>;
  act(() => {
    applying = fixture.result.current.candidate.handleApply();
  });
  await waitFor(() => expect(fixture.savedDescription()).toBe(candidate));
  const releaseOldVerification = fixture.holdNextEditorRead();
  await act(async () => {
    releaseManual();
    await saving;
  });
  fixture.failNextRead();
  await act(async () => {
    releaseApply();
    await applying;
  });
  expect(fixture.result.current.display.verificationError).toBeDefined();
  expect(fixture.cachedDescription()).toBe(original);
  await act(async () => releaseOldVerification(false));
  expect(fixture.result.current.display.verificationError).toBeDefined();
  await act(async () => fixture.result.current.display.refetch());
  expect(fixture.result.current.display.verificationError).toBeUndefined();
  expect(fixture.result.current.display.description).toBe(candidate);
});

it('수동 저장 응답이 늦어도 AI가 되돌린 본문을 편집 기준으로 사용한다', async () => {
  const original = '<p>처음 저장된 소개</p>';
  const intermediate = '<p>수동으로 수정한 소개</p>';
  const fixture = setup(original, original);
  await waitFor(() => {
    expect(fixture.result.current.editor.descriptionReady).toBe(true);
    expect(fixture.result.current.candidate.candidateJob?.id).toBe('candidate-1');
  });
  const release = fixture.holdNextMutationResponse('EditProductOnEditProductDescription');
  let saving!: Promise<void>;
  act(() => {
    saving = fixture.result.current.editor.submit({ description: intermediate });
  });
  await waitFor(() => expect(fixture.savedDescription()).toBe(intermediate));
  await act(async () => fixture.result.current.candidate.handleApply());
  expect(fixture.savedDescription()).toBe(original);
  fixture.failNextRead();
  await act(async () => {
    release();
    await saving;
  });
  expect(fixture.result.current.editor.form.getValues().description).toBe(original);
  expect(fixture.result.current.editor.verificationError).toBeDefined();
  await act(async () => fixture.result.current.display.refetch());
  await act(async () => fixture.result.current.editor.submit({ description: '<p>이어서 편집한 소개</p>' }));
  expect(fixture.savedDescription()).toBe('<p>이어서 편집한 소개</p>');
});

it.each([false, true])('수동 저장 중 다른 관리자가 저장한 본문을 다시 확인한다 (%s)', async fails => {
  const fixture = setup();
  const firstSave = '<p>먼저 성공한 저장</p>';
  const latest = '<p>다른 관리자가 이어서 저장한 본문</p>';
  await waitFor(() => expect(fixture.result.current.editor.descriptionReady).toBe(true));
  const release = fixture.holdNextMutationResponse('EditProductOnEditProductDescription');
  let saving!: Promise<void>;
  act(() => {
    saving = fixture.result.current.editor.submit({ description: firstSave });
  });
  await waitFor(() => expect(fixture.savedDescription()).toBe(firstSave));
  fixture.writeElsewhere(latest);
  if (fails) fixture.failNextRead();
  await act(async () => {
    release();
    await saving;
  });
  if (fails) {
    expect(fixture.result.current.display.description).toBe(firstSave);
    expect(fixture.result.current.display.verificationError).toBeDefined();
    expect(fixture.result.current.editor.verificationError).toBeDefined();
    await act(async () => fixture.result.current.display.refetch());
  }
  await waitFor(() => {
    expect(fixture.result.current.display.description).toBe(latest);
    expect(fixture.result.current.editor.form.getValues().description).toBe(latest);
  });
});

it('이전 본문과 같은 저장 응답이 도착해도 이미 시작한 최신 본문 확인을 유지한다', async () => {
  const original = '<p>변경 없이 저장한 본문</p>';
  const candidate = '<p>나중에 적용한 AI 본문</p>';
  const fixture = setup(original, candidate);
  await waitFor(() => {
    expect(fixture.result.current.editor.descriptionReady).toBe(true);
    expect(fixture.result.current.candidate.candidateJob?.id).toBe('candidate-1');
  });

  const releaseManual = fixture.holdNextMutationResponse('EditProductOnEditProductDescription');
  let saving!: Promise<void>;
  act(() => {
    saving = fixture.result.current.editor.submit({ description: original });
  });
  await waitFor(() => expect(fixture.operations).toContain('EditProductOnEditProductDescription'));
  const releaseCommit = fixture.holdNextApplyCommit();
  let applying!: Promise<void>;
  act(() => {
    applying = fixture.result.current.candidate.handleApply();
  });
  await waitFor(() => expect(fixture.operations).toContain('ApplyProductDescriptionCandidate'));
  await act(async () => fixture.result.current.display.refetch());

  const releaseFirstVerification = fixture.holdNextEditorRead();
  await act(async () => {
    releaseCommit();
    await applying;
  });
  expect(fixture.result.current.display.verificationPending).toBe(true);
  const releaseNewestVerification = fixture.holdNextEditorRead();
  await act(async () => {
    releaseManual();
    await saving;
  });
  expect(fixture.result.current.display.verificationPending).toBe(true);
  await act(async () => releaseNewestVerification(true));
  expect(fixture.result.current.display.verificationError).toBeDefined();
  await act(async () => releaseFirstVerification(false));
  expect(fixture.result.current.display.verificationError).toBeDefined();
  expect(fixture.cachedDescription()).toBe(original);
  await act(async () => fixture.result.current.display.refetch());
  expect(fixture.result.current.display.verificationError).toBeUndefined();
  expect(fixture.result.current.display.description).toBe(candidate);
});

it('충돌 조회 뒤 AI가 저장하면 재확인 중에는 본문 선택을 멈추고 실패 뒤 다시 조회할 수 있다', async () => {
  const fixture = setup();
  const latest = '<p>충돌 조회가 먼저 확인한 본문</p>';
  const draft = '<p>작성 중인 초안</p>';
  await waitFor(() => {
    expect(fixture.result.current.editor.descriptionReady).toBe(true);
    expect(fixture.result.current.candidate.candidateJob?.id).toBe('candidate-1');
  });
  fixture.writeElsewhere(latest);
  const releaseApply = fixture.holdNextApplyCommit();
  let applying!: Promise<void>;
  act(() => {
    applying = fixture.result.current.candidate.handleApply();
    fixture.result.current.editor.form.getInputProps('description').onChange(draft);
  });
  await act(async () => fixture.result.current.editor.submit({ description: draft }));
  expect(fixture.result.current.editor.conflictRefresh).toBeNull();
  expect(fixture.result.current.editor.latestDescription).toBe(latest);

  const releaseVerification = fixture.holdNextEditorRead();
  await act(async () => {
    releaseApply();
    await applying;
  });
  expect(fixture.result.current.editor.conflictRefresh).toBe('loading');
  act(() => fixture.result.current.editor.acceptLatestDescription());
  expect(fixture.result.current.editor.form.getValues().description).toBe(draft);
  await act(async () => releaseVerification(true));
  expect(fixture.result.current.editor.conflictRefresh).toBe('failed');
  await act(async () => fixture.result.current.editor.overwriteWithDraft());
  expect(fixture.savedDescription()).toBe('<p>Accepted AI candidate</p>');

  await act(async () => fixture.result.current.editor.refreshAfterConflict());
  expect(fixture.result.current.editor.conflictRefresh).toBeNull();
  expect(fixture.result.current.editor.latestDescription).toBe('<p>Accepted AI candidate</p>');
  expect(fixture.result.current.editor.form.getValues().description).toBe(draft);
});

it('충돌 조회가 늦으면 편집기에 이미 확인한 AI 적용 본문을 표시한다', async () => {
  const fixture = setup();
  const draft = '<p>그대로 남길 초안</p>';
  await waitFor(() => {
    expect(fixture.result.current.editor.descriptionReady).toBe(true);
    expect(fixture.result.current.candidate.candidateJob?.id).toBe('candidate-1');
  });
  fixture.writeElsewhere('<p>충돌 조회 시점의 이전 본문</p>');
  act(() => fixture.result.current.editor.form.getInputProps('description').onChange(draft));

  const release = fixture.holdNextEditorRead();
  let saving!: Promise<void>;
  act(() => {
    saving = fixture.result.current.editor.submit({ description: draft });
  });
  await waitFor(() => expect(fixture.result.current.editor.conflictRefresh).toBe('loading'));
  await act(async () => fixture.result.current.candidate.handleApply());
  await act(async () => {
    release(false);
    await saving;
  });
  expect(fixture.result.current.editor.conflictRefresh).toBeNull();
  expect(fixture.result.current.editor.latestDescription).toBe('<p>Accepted AI candidate</p>');
  expect(fixture.result.current.display.description).toBe('<p>Accepted AI candidate</p>');
  expect(fixture.result.current.editor.form.getValues().description).toBe(draft);
  await act(async () => fixture.result.current.editor.overwriteWithDraft());
  expect(fixture.savedDescription()).toBe(draft);
});

it('이전 AI 적용의 응답과 충돌 조회가 겹쳐도 다른 관리자가 저장한 최신 본문을 보여 준다', async () => {
  const fixture = setup();
  const latest = '<p>AI 적용 뒤 다른 관리자가 저장한 본문</p>';
  const draft = '<p>유지할 초안</p>';
  await waitFor(() => {
    expect(fixture.result.current.editor.descriptionReady).toBe(true);
    expect(fixture.result.current.candidate.candidateJob?.id).toBe('candidate-1');
  });

  const releaseApply = fixture.holdNextMutationResponse('ApplyProductDescriptionCandidate');
  let applying!: Promise<void>;
  act(() => {
    applying = fixture.result.current.candidate.handleApply();
  });
  await waitFor(() => expect(fixture.savedDescription()).toBe('<p>Accepted AI candidate</p>'));
  fixture.writeElsewhere(latest);
  act(() => fixture.result.current.editor.form.getInputProps('description').onChange(draft));
  const releaseRead = fixture.holdNextEditorRead();
  let saving!: Promise<void>;
  act(() => {
    saving = fixture.result.current.editor.submit({ description: draft });
  });
  await waitFor(() => expect(fixture.result.current.editor.conflictRefresh).toBe('loading'));
  await act(async () => {
    releaseApply();
    await applying;
    releaseRead(false);
    await saving;
  });
  expect(fixture.result.current.editor.conflictRefresh).toBeNull();
  expect(fixture.result.current.editor.latestDescription).toBe(latest);
  expect(fixture.result.current.editor.form.getValues().description).toBe(draft);
  expect(fixture.cachedDescription()).toBe(latest);
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
    const revised = '<p>최신 본문을 이어서 수정</p>';
    let readsBeforeRelease = 0;
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
      await act(async () => fixture.result.current.editor.submit({ description: revised }));
      expect(fixture.savedDescription()).toBe(revised);
      expect(fixture.result.current.editor.form.getValues().description).toBe(revised);
      expect(fixture.result.current.editor.saveError).toBeNull();
      readsBeforeRelease = reads();
    } finally {
      await act(async () => releaseRead(failEarlierRead));
    }
    await waitFor(() => {
      expect(reads()).toBe(readsBeforeRelease);
      expect(fixture.cachedDescription()).toBe(revised);
      expect(fixture.result.current.display.description).toBe(revised);
    });
    expect(fixture.result.current.editor.hasServerChange).toBe(false);
    expect(fixture.result.current.editor.descriptionReady).toBe(true);
    expect(fixture.result.current.editor.form.getValues().description).toBe(revised);
    await act(async () => fixture.result.current.candidate.handleApply());
    await waitFor(() =>
      expect(fixture.result.current.editor.form.getValues().description).toBe('<p>Accepted AI candidate</p>')
    );
  }
);

it.each([false, true])(
  '최신 본문을 채택한 뒤 AI가 원래 본문을 저장하면 이를 최신 본문으로 반영한다 (%s)',
  async failEarlierRead => {
    const original = '<p>처음 저장된 소개</p>';
    const latest = '<p>다른 관리자의 소개</p>';
    const fixture = setup(original, original);
    const reads = () => fixture.operations.filter(name => name === 'TempProductBySlugOnEditProductDescription').length;
    await waitFor(() => expect(fixture.result.current.editor.descriptionReady).toBe(true));
    const olderReads = reads();
    fixture.writeElsewhere('<p>이전 조회가 받은 중간 본문</p>');
    const releaseRead = fixture.holdNextEditorRead();
    act(() => fixture.result.current.editor.retryDescription());
    await waitFor(() => expect(reads()).toBe(olderReads + 1));
    try {
      fixture.writeElsewhere(latest);
      await act(async () =>
        fixture.result.current.editor.submit({
          description: '<p>오래된 초안</p>',
        })
      );
      act(() => fixture.result.current.editor.acceptLatestDescription());
      expect(fixture.result.current.editor.form.getValues().description).toBe(latest);
      expect(fixture.cachedDescription()).toBe(latest);
      await act(async () => fixture.result.current.candidate.handleApply());
      expect(fixture.result.current.editor.form.getValues().description).toBe(original);
      expect(fixture.result.current.display.description).toBe(original);
    } finally {
      await act(async () => releaseRead(failEarlierRead));
    }
    expect(fixture.cachedDescription()).toBe(original);
    expect(fixture.result.current.editor.form.getValues().description).toBe(original);
    expect(fixture.result.current.editor.hasServerChange).toBe(false);
    await act(async () =>
      fixture.result.current.editor.submit({
        description: '<p>이어 쓴 본문</p>',
      })
    );
    expect(fixture.savedDescription()).toBe('<p>이어 쓴 본문</p>');
  }
);

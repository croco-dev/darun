'use client';

import { gql } from '@apollo/client';
import { CombinedGraphQLErrors } from '@apollo/client/errors';
import { useApolloClient, useMutation, useQuery } from '@apollo/client/react';
import {
  MagazineOnAdminEditorDocument,
  EditMagazineOnAdminEditorDocument,
  PublishMagazineOnAdminEditorDocument,
  type MagazineOnAdminEditorQuery,
} from '@darun/provider-graphql';
import { Button } from '@darun/ui';
import {
  AdminActions,
  AdminEmptyState,
  AdminErrorState,
  AdminField,
  AdminInput,
  AdminLoadingState,
  AdminPanel,
  AdminSectionBody,
  Editor,
  getEditorTableError,
} from '@darun/ui-admin';
import { Link } from '@darun/utils-router';
import { useRef, useState } from 'react';

gql`
  query MagazineOnAdminEditor($slug: String!) {
    tempMagazineBySlug(slug: $slug) {
      id
      revision
      slug
      title
      summary
      content
      publishedAt
    }
  }
  mutation EditMagazineOnAdminEditor($slug: String!, $input: EditMagazineInput!) {
    editMagazine(slug: $slug, input: $input) {
      magazine {
        id
        revision
        slug
        title
        summary
        content
        publishedAt
      }
    }
  }
  mutation PublishMagazineOnAdminEditor($input: PublishMagazineInput!) {
    publishMagazine(input: $input) {
      magazine {
        id
        revision
        slug
        publishedAt
      }
    }
  }
`;

function isRevisionConflict(error: unknown) {
  return (
    CombinedGraphQLErrors.is(error) && error.errors.some(item => item.extensions?.code === 'magazine/revision-conflict')
  );
}

type Magazine = NonNullable<MagazineOnAdminEditorQuery['tempMagazineBySlug']>;

function MagazineEditor({ magazine }: { magazine: Magazine }) {
  const [values, setValues] = useState({
    title: magazine.title,
    summary: magazine.summary ?? '',
    content: magazine.content ?? '',
  });
  const client = useApolloClient();
  const [revision, setRevision] = useState(magazine.revision);
  const [conflict, setConflict] = useState(false);
  const [latest, setLatest] = useState<Magazine | null>(null);
  const [saved, setSaved] = useState(values);
  const [publishedAt, setPublishedAt] = useState(magazine.publishedAt);
  const [busy, setBusy] = useState<'save' | 'publish' | 'reload' | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const pending = useRef(false);
  const imageUploadPending = useRef(false);
  const [imageUploading, setImageUploading] = useState(false);
  const dirty = values.title !== saved.title || values.summary !== saved.summary || values.content !== saved.content;
  const [edit] = useMutation(EditMagazineOnAdminEditorDocument);
  const [publish] = useMutation(PublishMagazineOnAdminEditorDocument);

  const save = async () => {
    if (pending.current || imageUploadPending.current || conflict) return;
    const tableError = getEditorTableError(values.content);
    if (tableError) {
      setError(tableError);
      return;
    }
    if (!values.title.trim()) {
      setError('글 제목을 입력해주세요.');
      return;
    }
    pending.current = true;
    setBusy('save');
    setError(null);
    setMessage(null);
    try {
      const { data } = await edit({
        variables: {
          slug: magazine.slug,
          input: {
            ...values,
            title: values.title.trim(),
            expectedRevision: revision,
          },
        },
        update(cache) {
          cache.evict({ id: 'ROOT_QUERY', fieldName: 'tempAllMagazines' });
        },
      });
      const result = data?.editMagazine.magazine;
      if (!result) throw new Error('Missing saved magazine');
      const next = {
        title: result.title,
        summary: result.summary ?? '',
        content: result.content ?? '',
      };
      setRevision(result.revision);
      setPublishedAt(result.publishedAt);
      setValues(next);
      setSaved(next);
      setMessage('매거진을 저장했습니다.');
    } catch (cause) {
      if (isRevisionConflict(cause)) {
        setConflict(true);
        setLatest(null);
        setError('다른 곳에서 글이 변경되었습니다. 입력한 내용은 유지됩니다. 최신 저장본을 확인해주세요.');
      } else setError('저장하지 못했습니다. 입력한 내용은 유지됩니다. 다시 시도해주세요.');
    } finally {
      pending.current = false;
      setBusy(null);
    }
  };

  const publishMagazine = async () => {
    if (pending.current || imageUploadPending.current || dirty || publishedAt || conflict) return;
    pending.current = true;
    setBusy('publish');
    setError(null);
    setMessage(null);
    try {
      const { data } = await publish({
        variables: {
          input: { slug: magazine.slug, expectedRevision: revision },
        },
        update(cache) {
          cache.evict({ id: 'ROOT_QUERY', fieldName: 'tempAllMagazines' });
        },
      });
      const result = data?.publishMagazine.magazine;
      if (!result?.publishedAt) throw new Error('Missing publication');
      setPublishedAt(result.publishedAt);
      setMessage('매거진을 발행했습니다.');
    } catch (cause) {
      if (isRevisionConflict(cause)) {
        setConflict(true);
        setLatest(null);
        setError('검토한 뒤 글이 변경되어 발행하지 않았습니다. 최신 저장본을 확인해주세요.');
      } else setError('발행하지 못했습니다. 저장된 초안은 유지됩니다. 다시 시도해주세요.');
    } finally {
      pending.current = false;
      setBusy(null);
    }
  };

  const readLatest = async () => {
    if (pending.current || imageUploadPending.current) return;
    pending.current = true;
    setBusy('reload');
    setLatest(null);
    setError(null);
    try {
      const { data } = await client.query({
        query: MagazineOnAdminEditorDocument,
        variables: { slug: magazine.slug },
        fetchPolicy: 'no-cache',
      });
      if (!data?.tempMagazineBySlug || data.tempMagazineBySlug.id !== magazine.id) {
        throw new Error('Missing current magazine');
      }
      setLatest(data.tempMagazineBySlug);
    } catch {
      setError('최신 저장본을 불러오지 못했습니다. 입력한 내용은 유지됩니다. 다시 확인해주세요.');
    } finally {
      pending.current = false;
      setBusy(null);
    }
  };

  const acceptLatest = (keepDraft: boolean) => {
    if (!latest || pending.current || imageUploadPending.current) return;
    const next = {
      title: latest.title,
      summary: latest.summary ?? '',
      content: latest.content ?? '',
    };
    setRevision(latest.revision);
    setSaved(next);
    setPublishedAt(latest.publishedAt);
    if (!keepDraft) setValues(next);
    setLatest(null);
    setConflict(false);
    setError(null);
    setMessage(
      keepDraft
        ? '내 초안을 유지했습니다. 최신 저장본을 바꾸려면 저장해주세요.'
        : '최신 저장본을 편집기에 반영했습니다. 내용을 확인한 뒤 발행해주세요.'
    );
  };

  return (
    <form
      onSubmit={event => {
        event.preventDefault();
        void save();
      }}
      className="flex flex-col gap-5"
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm font-medium text-dark-900">{publishedAt ? '발행됨' : '초안(미발행)'}</p>
        {publishedAt && (
          <a
            href={`https://darun.io/ko/magazines/${encodeURIComponent(magazine.slug)}`}
            target="_blank"
            rel="noreferrer noopener"
            className="text-sm underline"
          >
            공개 글 보기
          </a>
        )}
      </div>
      <AdminField label="글 제목">
        <AdminInput
          value={values.title}
          disabled={!!busy}
          onChange={event => setValues({ ...values, title: event.target.value })}
        />
      </AdminField>
      <AdminField label="한 줄 요약">
        <AdminInput
          value={values.summary}
          disabled={!!busy}
          onChange={event => setValues({ ...values, summary: event.target.value })}
        />
      </AdminField>
      <section aria-label="본문" className="min-w-0">
        <h2 className="mb-2 text-sm font-medium text-dark-900">본문</h2>
        <Editor
          value={values.content}
          disabled={!!busy}
          editable={!busy}
          onChange={content => setValues(current => ({ ...current, content }))}
          onImageUploadingChange={uploading => {
            imageUploadPending.current = uploading;
            setImageUploading(uploading);
          }}
        />
      </section>
      {dirty && <p className="text-sm text-dark-600">저장하지 않은 변경사항이 있습니다. 발행 전에 저장해주세요.</p>}
      {imageUploading && (
        <p role="status" className="text-sm text-dark-600">
          본문 이미지를 업로드하고 있습니다. 완료 후 저장할 수 있습니다.
        </p>
      )}
      {error && (
        <p role="alert" className="text-sm text-cherry-700">
          {error}
        </p>
      )}
      {message && (
        <p role="status" className="text-sm text-leaf-700">
          {message}
        </p>
      )}
      {conflict && (
        <section aria-label="저장 충돌 확인" className="flex min-w-0 flex-col gap-3 rounded border border-dark-200 p-4">
          <p className="text-sm">다른 곳에서 저장한 내용과 내 초안을 확인한 뒤 기준을 선택해주세요.</p>
          <Button type="button" disabled={!!busy || imageUploading} onClick={() => void readLatest()}>
            {busy === 'reload' ? '확인 중...' : '최신 저장본 확인'}
          </Button>
          {latest && (
            <section aria-label="최신 저장본" className="flex min-w-0 flex-col gap-3">
              <h2 className="font-medium">최신 저장본</h2>
              <p className="break-words">제목: {latest.title}</p>
              <p className="break-words">요약: {latest.summary || '없음'}</p>
              <Editor value={latest.content ?? ''} onChange={() => {}} disabled editable={false} />
              <p className="text-sm">내 초안을 유지해 저장하면 최신 저장본의 제목·요약·본문이 내 입력으로 바뀝니다.</p>
              <Button type="button" disabled={!!busy || imageUploading} onClick={() => acceptLatest(true)}>
                최신 버전을 기준으로 내 초안 유지
              </Button>
              <Button type="button" disabled={!!busy || imageUploading} onClick={() => acceptLatest(false)}>
                내 입력을 최신 저장본으로 바꾸기
              </Button>
            </section>
          )}
        </section>
      )}
      <AdminActions>
        <Button as={Link} href="/magazines" variant="contained" color="secondary" disabled={!!busy}>
          목록
        </Button>
        <Button type="submit" variant="contained" color="primary" disabled={!!busy || imageUploading || conflict}>
          {busy === 'save' ? '저장 중...' : '저장'}
        </Button>
        {!publishedAt && (
          <Button
            type="button"
            variant="contained"
            color="primary"
            disabled={!!busy || imageUploading || dirty || conflict}
            onClick={() => void publishMagazine()}
          >
            {busy === 'publish' ? '발행 중...' : '발행'}
          </Button>
        )}
      </AdminActions>
    </form>
  );
}

export function MagazineEditSection({ slug }: { slug: string }) {
  const { data, loading, error, refetch } = useQuery(MagazineOnAdminEditorDocument, {
    variables: { slug },
    fetchPolicy: 'network-only',
  });
  let content;
  if (loading) content = <AdminLoadingState />;
  else if (error)
    content = (
      <AdminErrorState
        title="매거진을 불러오지 못했습니다."
        error={error}
        action={
          <Button
            type="button"
            onClick={() => {
              refetch().catch(() => {});
            }}
          >
            다시 시도
          </Button>
        }
      />
    );
  else if (!data?.tempMagazineBySlug) content = <AdminEmptyState title="매거진을 찾을 수 없습니다." />;
  else content = <MagazineEditor key={data.tempMagazineBySlug.id} magazine={data.tempMagazineBySlug} />;
  return (
    <AdminPanel>
      <AdminSectionBody>{content}</AdminSectionBody>
    </AdminPanel>
  );
}

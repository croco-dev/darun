'use client';

import { gql } from '@apollo/client';
import { useMutation, useQuery } from '@apollo/client/react';
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
        slug
        publishedAt
      }
    }
  }
`;

type Magazine = NonNullable<MagazineOnAdminEditorQuery['tempMagazineBySlug']>;

function MagazineEditor({ magazine }: { magazine: Magazine }) {
  const [values, setValues] = useState({
    title: magazine.title,
    summary: magazine.summary ?? '',
    content: magazine.content ?? '',
  });
  const [saved, setSaved] = useState(values);
  const [publishedAt, setPublishedAt] = useState(magazine.publishedAt);
  const [busy, setBusy] = useState<'save' | 'publish' | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const pending = useRef(false);
  const imageUploadPending = useRef(false);
  const [imageUploading, setImageUploading] = useState(false);
  const dirty = values.title !== saved.title || values.summary !== saved.summary || values.content !== saved.content;
  const [edit] = useMutation(EditMagazineOnAdminEditorDocument);
  const [publish] = useMutation(PublishMagazineOnAdminEditorDocument);

  const save = async () => {
    if (pending.current || imageUploadPending.current) return;
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
          input: { ...values, title: values.title.trim() },
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
      setValues(next);
      setSaved(next);
      setMessage('매거진을 저장했습니다.');
    } catch {
      setError('저장하지 못했습니다. 입력한 내용은 유지됩니다. 다시 시도해주세요.');
    } finally {
      pending.current = false;
      setBusy(null);
    }
  };

  const publishMagazine = async () => {
    if (pending.current || imageUploadPending.current || dirty || publishedAt) return;
    pending.current = true;
    setBusy('publish');
    setError(null);
    setMessage(null);
    try {
      const { data } = await publish({
        variables: { input: { slug: magazine.slug } },
        update(cache) {
          cache.evict({ id: 'ROOT_QUERY', fieldName: 'tempAllMagazines' });
        },
      });
      const result = data?.publishMagazine.magazine;
      if (!result?.publishedAt) throw new Error('Missing publication');
      setPublishedAt(result.publishedAt);
      setMessage('매거진을 발행했습니다.');
    } catch {
      setError('발행하지 못했습니다. 저장된 초안은 유지됩니다. 다시 시도해주세요.');
    } finally {
      pending.current = false;
      setBusy(null);
    }
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
      <AdminActions>
        <Button as={Link} href="/magazines" variant="contained" color="secondary" disabled={!!busy}>
          목록
        </Button>
        <Button type="submit" variant="contained" color="primary" disabled={!!busy || imageUploading}>
          {busy === 'save' ? '저장 중...' : '저장'}
        </Button>
        {!publishedAt && (
          <Button
            type="button"
            variant="contained"
            color="primary"
            disabled={!!busy || imageUploading || dirty}
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

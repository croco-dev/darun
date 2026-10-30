'use client';

import { gql } from '@apollo/client';
import { useMutation } from '@apollo/client/react';
import { isValidMagazineSlug } from '@darun/magazines-domain/src/slug/isValidMagazineSlug';
import { CreateMagazineOnWriteMagazineDocument } from '@darun/provider-graphql';
import { useImageUpload } from '@darun/utils-image-upload';
import { useNavigate } from '@darun/utils-router';
import { FileWithPath } from '@mantine/dropzone';
import { useForm } from '@mantine/form';
import { notifications } from '@mantine/notifications';
import { useEffect, useRef, useState } from 'react';

gql`
  mutation CreateMagazineOnWriteMagazine($input: CreateMagazineInput!) {
    createMagazine(input: $input) {
      magazine {
        id
        slug
      }
    }
  }
`;

type FormValues = {
  title: string;
  slug: string;
  summary?: string;
  content?: string;
  backgroundImageUrl?: string;
};

function validateSlug(value: string, title: string) {
  const finalSlug = value.trim() || title.trim().toLowerCase().replace(/ /g, '-');
  if (!isValidMagazineSlug(finalSlug)) {
    return '상세 주소로 사용할 수 없는 슬러그입니다. 제목이나 슬러그를 변경해주세요.';
  }
  if (/\s/.test(value.trim())) {
    return '슬러그에는 공백(띄어쓰기)을 포함할 수 없습니다.';
  }
  return null;
}

export function useWriteMagazine() {
  const navigate = useNavigate();
  const submitted = useRef(false);
  const [createMagazine, { loading: isCreating }] = useMutation(CreateMagazineOnWriteMagazineDocument, {
    update(cache) {
      cache.evict({ id: 'ROOT_QUERY', fieldName: 'tempAllMagazines' });
    },
  });
  const form = useForm<FormValues>({
    initialValues: {
      title: '',
      slug: '',
      summary: '',
      content: '',
      backgroundImageUrl: '',
    },
    validate: {
      title: value => (!value?.trim() ? '글 제목을 입력해주세요.' : null),
      slug: (value, values) => validateSlug(value, values.title),
    },
  });
  const { upload } = useImageUpload();
  const [isUploading, setIsUploading] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  useEffect(() => {
    return () => {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);

  const handleSubmit = async (values: FormValues) => {
    if (submitted.current || isCreating || isUploading) return;
    if (!values.title?.trim()) {
      return;
    }
    const slugError = validateSlug(values.slug, values.title);
    if (slugError) {
      form.setFieldError('slug', slugError);
      return;
    }

    submitted.current = true;
    try {
      const { data } = await createMagazine({
        variables: {
          input: {
            title: values.title.trim(),
            slug: values.slug?.trim() || undefined,
            summary: values.summary?.trim() || '',
            backgroundImageUrl: values.backgroundImageUrl?.trim() || '',
          },
        },
      });
      const magazine = data?.createMagazine.magazine;
      if (!magazine?.slug) throw new Error('Missing saved draft');
      notifications.show({
        message: '매거진 초안을 저장했습니다. 본문을 작성한 뒤 발행해주세요.',
        color: 'teal',
      });
      navigate(`/magazines/edit?slug=${encodeURIComponent(magazine.slug)}`);
    } catch {
      submitted.current = false;
      notifications.show({
        title: '초안 저장 실패',
        message: '초안을 저장하지 못했습니다. 입력을 확인하고 다시 시도해주세요.',
        color: 'red',
      });
    }
  };

  const handleFileDrop = async (files: FileWithPath[]) => {
    if (isUploading || isCreating) return;
    const droppedFile = files[0];
    if (!droppedFile) return;

    if (!droppedFile.type.startsWith('image/')) {
      notifications.show({
        message: '이미지 파일만 업로드할 수 있습니다.',
        color: 'red',
      });
      return;
    }

    const MAX_FILE_SIZE = 10 * 1024 * 1024;
    if (droppedFile.size > MAX_FILE_SIZE) {
      notifications.show({
        message: '10MB 이하의 이미지 파일만 업로드할 수 있습니다.',
        color: 'red',
      });
      return;
    }

    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }
    const objectUrl = URL.createObjectURL(droppedFile);
    setPreviewUrl(objectUrl);
    setFile(droppedFile);

    setIsUploading(true);
    try {
      const imageUrl = await upload('images/magazines', droppedFile, droppedFile.name);
      if (!imageUrl) {
        URL.revokeObjectURL(objectUrl);
        setPreviewUrl(null);
        setFile(null);
        form.setFieldValue('backgroundImageUrl', '');
        return;
      }
      form.setFieldValue('backgroundImageUrl', imageUrl);
      notifications.show({
        message: '이미지가 업로드되었습니다.',
        color: 'teal',
      });
    } catch (error) {
      URL.revokeObjectURL(objectUrl);
      setPreviewUrl(null);
      setFile(null);
      form.setFieldValue('backgroundImageUrl', '');
      notifications.show({
        message: '이미지 업로드에 실패했습니다.',
        color: 'red',
      });
    } finally {
      setIsUploading(false);
    }
  };

  const handleFileRemove = () => {
    if (isUploading || isCreating) return;
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
      setPreviewUrl(null);
    }
    setFile(null);
    form.setFieldValue('backgroundImageUrl', '');
  };

  return {
    form,
    handleSubmit,
    handleFileDrop,
    handleFileRemove,
    file,
    previewUrl,
    isUploading,
    isSubmitting: isCreating || isUploading,
  };
}

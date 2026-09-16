import { gql } from '@apollo/client';
import { useMutation } from '@apollo/client/react';
import {
  CreateMagazineOnWriteMagazineDocument,
  TempAllMagazinesOnMagazinesListDocument,
} from '@darun/provider-graphql';
import { useImageUpload } from '@darun/utils-image-upload';
import { FileWithPath } from '@mantine/dropzone';
import { useForm } from '@mantine/form';
import { notifications } from '@mantine/notifications';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

// eslint-disable-next-line @typescript-eslint/no-unused-expressions
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

export function useWriteMagazine() {
  const { push } = useRouter();
  const [createMagazine, { loading: isCreating }] = useMutation(CreateMagazineOnWriteMagazineDocument, {
    refetchQueries: [TempAllMagazinesOnMagazinesListDocument],
    awaitRefetchQueries: true,
    onCompleted: () => {
      notifications.show({ message: '매거진이 성공적으로 발행되었습니다.', color: 'teal' });
      push('/magazines');
    },
    onError: error => {
      notifications.show({
        title: '발행 실패',
        message: error.message,
        color: 'red',
      });
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
      slug: value => {
        if (value && /\s/.test(value.trim())) {
          return '슬러그에는 공백(띄어쓰기)을 포함할 수 없습니다.';
        }
        return null;
      },
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
    if (isCreating || isUploading) return;
    if (!values.title?.trim()) {
      return;
    }

    try {
      await createMagazine({
        variables: {
          input: {
            title: values.title.trim(),
            slug: values.slug?.trim() || undefined,
            summary: values.summary?.trim() || '',
            backgroundImageUrl: values.backgroundImageUrl?.trim() || '',
          },
        },
      });
    } catch (error) {
      console.error('mutation failed:', error);
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

    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }
    setPreviewUrl(URL.createObjectURL(droppedFile));
    setFile(droppedFile);

    setIsUploading(true);
    try {
      const imageUrl = await upload('images/magazines', droppedFile, droppedFile.name);
      form.setFieldValue('backgroundImageUrl', imageUrl);
      notifications.show({
        message: '이미지가 업로드되었습니다.',
        color: 'teal',
      });
    } catch (error) {
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

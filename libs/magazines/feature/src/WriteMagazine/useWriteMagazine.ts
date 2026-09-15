'use client';

import { gql } from '@apollo/client';
import { useMutation } from '@apollo/client/react';
import { CreateMagazineOnWriteMagazineDocument } from '@darun/provider-graphql';
import { useImageUpload } from '@darun/utils-image-upload';
import { FileWithPath } from '@mantine/dropzone';
import { useForm } from '@mantine/form';
import { notifications } from '@mantine/notifications';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

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
  const [createMagazine] = useMutation(CreateMagazineOnWriteMagazineDocument, {
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
    },
  });
  const { upload } = useImageUpload();
  const [isUploading, setIsUploading] = useState(false);
  const [file, setFile] = useState<File | null>(null);

  const handleSubmit = async (values: FormValues) => {
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
    const droppedFile = files[0];
    if (!droppedFile) return;

    setIsUploading(true);
    try {
      const imageUrl = await upload('images/magazines', droppedFile, droppedFile.name);
      setFile(droppedFile);
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
    setFile(null);
    form.setFieldValue('backgroundImageUrl', '');
  };

  return {
    form,
    handleSubmit,
    handleFileDrop,
    handleFileRemove,
    file,
    isUploading,
  };
}

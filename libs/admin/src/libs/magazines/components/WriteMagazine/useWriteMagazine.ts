import { FileWithPath } from '@mantine/dropzone';
import { useForm } from '@mantine/form';
import { notifications } from '@mantine/notifications';
import { useState } from 'react';
import { useImageUpload } from '../../../utils/useImageUplaod';

type FormValues = {
  title: string;
  slug: string;
  summary?: string;
  content?: string;
  backgroundImageUrl?: string;
};

export function useWriteMagazine() {
  const form = useForm<FormValues>({
    initialValues: {
      title: '',
      slug: '',
      summary: '',
    },
    mode: 'uncontrolled',
  });
  const { upload } = useImageUpload();
  const [file, setFile] = useState<FileWithPath | null>(null);

  const handleFileDrop = (files: FileWithPath[]) => {
    setFile(files[0]);
  };
  const handleFileRemove = () => {
    setFile(null);
  };

  const handleSubmit = async (values: FormValues) => {
    if (!values.title) return;

    if (!file) {
      notifications.show({ message: '배경 이미지를 올려주세요.', color: 'red' });
      return;
    }
    const imageUrl = await upload('images/magazine_thumbs', file, file.name);
    if (!imageUrl) {
      notifications.show({ message: '이미지 업로드에 실패했어요.', color: 'red' });
      return;
    }
  };

  return { form, handleSubmit, handleFileDrop, file, handleFileRemove };
}

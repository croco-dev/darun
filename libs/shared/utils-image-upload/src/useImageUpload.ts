'use client';

import { gql, useMutation } from '@apollo/client';
import { Mutation, MutationsignImageUploadArgs } from '@darun/provider-graphql';
import { notifications } from '@mantine/notifications';

const SIGN_IMAGE_UPLOAD = gql`
  mutation SignImageUpload($input: SignImageUploadInput!) {
    signImageUpload(input: $input) {
      signature
      folder
      timestamp
    }
  }
`;

type CloudinaryUploadResponse = {
  secure_url?: string;
  error?: {
    message?: string;
  };
  message?: string;
};

function getUploadErrorMessage(payload: CloudinaryUploadResponse) {
  if (typeof payload.error?.message === 'string') {
    return payload.error.message;
  }

  if (typeof payload.message === 'string') {
    return payload.message;
  }

  return undefined;
}

export function useImageUpload() {
  const [signImageUpload] = useMutation<Pick<Mutation, 'signImageUpload'>, MutationsignImageUploadArgs>(
    SIGN_IMAGE_UPLOAD
  );

  async function upload(folder: string, file: File, displayName: string) {
    const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
    const apiKey = process.env.NEXT_PUBLIC_CLOUDINARY_API_KEY;

    if (!cloudName || !apiKey) {
      notifications.show({
        message: '이미지 업로드 설정이 누락되었습니다.',
        color: 'red',
      });
      return undefined;
    }

    const result = await signImageUpload({
      variables: {
        input: {
          folder,
          displayName,
        },
      },
    });

    const signedPayload = result.data?.signImageUpload;

    if (!signedPayload) {
      notifications.show({
        message: '이미지 업로드 서명을 생성하지 못했습니다.',
        color: 'red',
      });
      return undefined;
    }

    const formData = new FormData();
    formData.append('file', file);
    formData.append('api_key', apiKey);
    formData.append('folder', signedPayload.folder);
    formData.append('signature', signedPayload.signature);
    formData.append('timestamp', String(signedPayload.timestamp));

    const response = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/auto/upload`, {
      method: 'POST',
      body: formData,
    });

    const payload = (await response.json()) as CloudinaryUploadResponse;

    if (!response.ok) {
      notifications.show({
        message: getUploadErrorMessage(payload) ?? '이미지 업로드 중 오류가 발생했습니다.',
        color: 'red',
      });
      return undefined;
    }

    if (!payload.secure_url) {
      notifications.show({
        message: '업로드 응답에서 이미지 URL을 찾지 못했습니다.',
        color: 'red',
      });
      return undefined;
    }

    return payload.secure_url;
  }

  return { upload };
}

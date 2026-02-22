import { gql } from '@apollo/client';
import { notifications } from '@mantine/notifications';
import { useSignImageUploadOnUseImageUploadMutation } from './__generated__/useImageUpload';

const getUploadErrorMessage = (payload: unknown): string | undefined => {
  if (!payload || typeof payload !== 'object') {
    return undefined;
  }

  if ('error' in payload && payload.error && typeof payload.error === 'object' && 'message' in payload.error) {
    const message = payload.error.message;
    if (typeof message === 'string' && message.trim()) {
      return message;
    }
  }

  if ('message' in payload) {
    const message = payload.message;
    if (typeof message === 'string' && message.trim()) {
      return message;
    }
  }

  return undefined;
};

export const signImageUploadOnUseImageUploadMutationDocument = gql`
  mutation SignImageUploadOnUseImageUpload($input: SignImageUploadInput!) {
    signImageUpload(input: $input) {
      signature
      folder
      timestamp
    }
  }
`;

export function useImageUpload() {
  const [sign] = useSignImageUploadOnUseImageUploadMutation();

  const upload = async (folder: string, file: File, displayName: string) => {
    const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
    const apiKey = process.env.NEXT_PUBLIC_CLOUDINARY_API_KEY;

    if (!cloudName || !apiKey) {
      notifications.show({
        message: '이미지 업로드 환경설정이 누락되었습니다.',
        color: 'red',
      });
      return;
    }

    let data: Awaited<ReturnType<typeof sign>>['data'] | undefined;
    try {
      ({ data } = await sign({
        variables: {
          input: {
            displayName,
            folder,
          },
        },
      }));
    } catch {
      notifications.show({
        message: '이미지 업로드 요청에 실패했어요.',
        color: 'red',
      });
      return;
    }

    if (!data?.signImageUpload) {
      notifications.show({
        message: '이미지 업로드 요청 암호화에 실패했습니다.',
        color: 'red',
      });
      return;
    }

    const form = new FormData();
    form.append('file', file);
    form.append('api_key', apiKey);
    form.append('timestamp', data.signImageUpload.timestamp.toString());
    form.append('signature', data.signImageUpload.signature);
    form.append('public_id', displayName);
    form.append('folder', data.signImageUpload.folder);

    let response: Response;
    try {
      response = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, {
        method: 'POST',
        body: form,
      });
    } catch {
      notifications.show({
        message: '이미지 업로드 요청 중 네트워크 오류가 발생했어요.',
        color: 'red',
      });
      return;
    }

    let payload: unknown;
    try {
      payload = await response.json();
    } catch {
      notifications.show({
        message: '이미지 업로드 응답을 읽지 못했어요.',
        color: 'red',
      });
      return;
    }

    if (!response.ok) {
      const errorMessage = getUploadErrorMessage(payload);
      notifications.show({
        message: errorMessage
          ? `이미지 업로드에 실패했어요. (${errorMessage})`
          : `이미지 업로드에 실패했어요. (HTTP ${response.status})`,
        color: 'red',
      });
      return;
    }

    if (!payload || typeof payload !== 'object' || !('secure_url' in payload)) {
      notifications.show({
        message: '이미지 업로드 응답 형식이 올바르지 않아요.',
        color: 'red',
      });
      return;
    }

    const secureUrl = payload.secure_url;
    if (typeof secureUrl !== 'string' || !secureUrl) {
      notifications.show({
        message: '이미지 업로드 결과 URL을 찾지 못했어요.',
        color: 'red',
      });
      return;
    }

    return secureUrl;
  };

  return {
    upload,
  };
}

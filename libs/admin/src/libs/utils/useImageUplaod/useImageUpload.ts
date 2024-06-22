import { gql } from '@apollo/client';
import { notifications } from '@mantine/notifications';
import { useSignImageUploadOnUseImageUploadMutation } from './__generated__/useImageUpload';

const UPLOAD_URL = 'https://api.cloudinary.com/v1_1/' + process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME + '/image/upload';

gql`
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
    const { data } = await sign({
      variables: {
        input: {
          displayName,
          folder,
        },
      },
    });

    if (!data) {
      notifications.show({ message: '이미지 업로드 요청 암호화에 실패했습니다.', color: 'red' });
      return;
    }

    const form = new FormData();
    form.append('file', file);
    form.append('api_key', process.env.NEXT_PUBLIC_CLOUDINARY_API_KEY ?? '');
    form.append('timestamp', data.signImageUpload.timestamp.toString());
    form.append('signature', data.signImageUpload.signature);
    form.append('public_id', displayName);
    form.append('folder', data.signImageUpload.folder);
    const response = await fetch(UPLOAD_URL, { method: 'POST', body: form });
    const json = (await response.json()) as { secure_url: string } | undefined;
    return json?.secure_url;
  };

  return {
    upload,
  };
}

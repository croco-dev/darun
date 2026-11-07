'use client';

import { gql } from '@apollo/client';
import { useMutation } from '@apollo/client/react';
import {
  SignImageUploadDocument,
  SignImageUploadMutation,
  SignImageUploadMutationVariables,
} from '@darun/provider-graphql';
import { notifications } from '@mantine/notifications';
import { useEffect, useRef } from 'react';
import { buildUniqueDisplayName } from './buildUniqueDisplayName';

gql`
  mutation SignImageUpload($input: SignImageUploadInput!) {
    signImageUpload(input: $input) {
      signature
      folder
      timestamp
    }
  }
`;

const IMAGE_UPLOAD_TIMEOUT_MS = 60_000;

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
  const [signImageUpload] = useMutation<SignImageUploadMutation, SignImageUploadMutationVariables>(
    SignImageUploadDocument
  );
  const activeUploads = useRef(new Set<AbortController>());
  const mounted = useRef(true);
  useEffect(() => {
    mounted.current = true;
    const uploads = activeUploads.current;
    return () => {
      mounted.current = false;
      for (const controller of uploads) controller.abort();
    };
  }, []);
  const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
  const apiKey = process.env.NEXT_PUBLIC_CLOUDINARY_API_KEY;
  const configurationError = !cloudName || !apiKey ? '이미지 업로드 설정이 누락되었습니다.' : null;

  async function upload(folder: string, file: File, displayName: string, signal?: AbortSignal) {
    signal?.throwIfAborted();
    if (!mounted.current) throw new DOMException('Upload cancelled', 'AbortError');
    if (!cloudName || !apiKey) {
      notifications.show({
        message: configurationError,
        color: 'red',
      });
      return undefined;
    }

    const controller = new AbortController();
    const cancel = () => controller.abort(signal?.reason);
    signal?.addEventListener('abort', cancel, { once: true });
    activeUploads.current.add(controller);
    const timer = setTimeout(() => {
      controller.abort(new DOMException('Image upload timed out', 'TimeoutError'));
    }, IMAGE_UPLOAD_TIMEOUT_MS);
    let rejectCancelled!: () => void;
    const cancelled = new Promise<never>((_resolve, reject) => {
      rejectCancelled = () => reject(controller.signal.reason);
      controller.signal.addEventListener('abort', rejectCancelled, {
        once: true,
      });
    });

    const performUpload = async () => {
      const uniqueDisplayName = buildUniqueDisplayName(displayName);
      const result = await signImageUpload({
        context: { fetchOptions: { signal: controller.signal } },
        variables: {
          input: {
            folder,
            displayName: uniqueDisplayName,
          },
        },
      });

      controller.signal.throwIfAborted();
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
      formData.append('public_id', uniqueDisplayName);
      formData.append('signature', signedPayload.signature);
      formData.append('timestamp', String(signedPayload.timestamp));

      const response = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/auto/upload`, {
        method: 'POST',
        signal: controller.signal,
        body: formData,
      });

      controller.signal.throwIfAborted();
      const payload = (await response.json()) as CloudinaryUploadResponse;
      controller.signal.throwIfAborted();

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
    };
    try {
      return await Promise.race([performUpload(), cancelled]);
    } finally {
      clearTimeout(timer);
      signal?.removeEventListener('abort', cancel);
      controller.signal.removeEventListener('abort', rejectCancelled);
      activeUploads.current.delete(controller);
    }
  }

  return { upload, configurationError };
}

import { bind } from '@croco/utils-structure-react';
import { Button, Group, Stack, TextInput, Text, Input, Image } from '@mantine/core';
import { Dropzone, IMAGE_MIME_TYPE } from '@mantine/dropzone';
import { IconPhoto, IconUpload, IconX } from '@tabler/icons-react';
import React from 'react';
import { useWriteMagazine } from './useWriteMagazine';

export const WriteMagazine = bind(
  useWriteMagazine,
  ({ form, handleSubmit, handleFileDrop, file, handleFileRemove }) => {
    const ImagePreview = () => {
      if (!file) return null;
      const imageUrl = URL.createObjectURL(file);
      return (
        <Image
          src={imageUrl}
          onLoad={() => URL.revokeObjectURL(imageUrl)}
          style={{
            height: 190,
            display: 'flex',
            flex: 'auto',
            objectFit: 'contain',
            width: 'auto',
          }}
        />
      );
    };

    return (
      <form onSubmit={form.onSubmit(handleSubmit)}>
        <Stack gap={'12px'}>
          <TextInput
            label="글 제목"
            placeholder="ex) 다른의 서비스 종료 발표, 대안 서비스는 뭐가 있을까?"
            key={form.key('title')}
            {...form.getInputProps('title')}
          />
          <Stack gap={1}>
            <TextInput
              label="슬러그(slug) (선택, 미입력시 자동생성)"
              placeholder="ex) darun-io-service-jongryo"
              key={form.key('slug')}
              {...form.getInputProps('slug')}
            />
            <Text size={'xs'} c={'dimmed'}>
              {
                '링크로 뒤에 표시될 내용입니다. 띄어쓰기가 있어서는 안됩니다. / 사용 예: darun-io -> https://darun.io/magazines/darun-io'
              }
            </Text>
          </Stack>
          <TextInput
            label="한 줄 요약"
            placeholder="ex) 사용자가 없기에 종료의 영향이 없지만, 제가 슬프니 정리해봤습니다."
            key={form.key('summary')}
            {...form.getInputProps('summary')}
          />
          <Stack>
            <Input.Label>뒷 배경 이미지</Input.Label>

            {!file ? (
              <Dropzone
                onDrop={handleFileDrop}
                maxSize={5 * 1024 ** 2}
                accept={IMAGE_MIME_TYPE}
                style={{ border: '1px solid #ccc', borderRadius: '4px' }}
              >
                <Group justify="center" gap="xl" mih={220} style={{ pointerEvents: 'none' }}>
                  <Dropzone.Accept>
                    <IconUpload size={52} color="var(--mantine-color-blue-6)" stroke={1.5} />
                  </Dropzone.Accept>
                  <Dropzone.Reject>
                    <IconX size={52} color="var(--mantine-color-red-6)" stroke={1.5} />
                  </Dropzone.Reject>
                  <Dropzone.Idle>
                    <IconPhoto size={52} color="var(--mantine-color-dimmed)" stroke={1.5} />
                  </Dropzone.Idle>

                  <div>
                    <Text size="xl" inline>
                      이미지 끌어오거나 클릭하여 첨부
                    </Text>
                    <Text size="sm" c="dimmed" inline mt={7}>
                      한개만 첨부해주세요. png, jpg, jpeg, webp, bmp, avif 등 지원
                    </Text>
                  </div>
                </Group>
              </Dropzone>
            ) : (
              <Group>
                <ImagePreview />
                <Button color={'dark'} onClick={() => handleFileRemove()}>
                  이미지 삭제
                </Button>
              </Group>
            )}
          </Stack>
        </Stack>

        <Stack mt={12}>글 작성은 저장 후, 수정 기능을 이용하여 가능합니다.</Stack>

        <Group justify="flex-end" mt="md">
          <Button type="submit" color={'dark'}>
            저장
          </Button>
        </Group>
      </form>
    );
  }
);

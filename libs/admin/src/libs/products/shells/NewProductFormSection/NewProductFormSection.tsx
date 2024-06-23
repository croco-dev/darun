'use client';

import { Button, Card, Stack, TextInput, Text, Textarea, FileInput } from '@mantine/core';
import { NewProductForm } from '../../components/NewProductForm';

export const NewProductFormSection = () => (
  <NewProductForm>
    {({ form }) => (
      <Card withBorder shadow="sm" radius="md">
        <Card.Section withBorder inheritPadding py="xs">
          <Text fw={500}>서비스 등록</Text>
        </Card.Section>
        <Card.Section inheritPadding mt="sm" pb="md">
          <Stack>
            <TextInput
              name="name"
              size="md"
              label="이름"
              placeholder="ex) NAVER"
              form="new-product-form"
              {...form.getInputProps('name')}
            />
            <TextInput name="slug" size="md" label="slug" placeholder="ex) naver" {...form.getInputProps('slug')} />
            <Textarea
              name="summary"
              size="md"
              label="짧은 설명"
              autosize
              minRows={4}
              placeholder="ex) 국내 검색 엔진 1위 기업. 포털 사이트로도 유명하다. 네이버 검색, 뉴스, 지도, 카페, 블로그 서비스를 제공하고 있으며, 네이버 웨일, 네이버 클라우드, 네이버 페이 등 다양한 서비스를 운영하고 있습니다."
              {...form.getInputProps('summary')}
            />
            <TextInput
              name="logoName"
              size="md"
              label="파일 이름"
              placeholder="naver.png"
              {...form.getInputProps('logoName')}
            />
            <FileInput
              name="file"
              size="md"
              label="로고"
              accept="image/png,image/jpeg,image/webp"
              {...form.getInputProps('file')}
            />
            <Button type="submit" size={'md'} color={'dark'}>
              등록
            </Button>
          </Stack>
        </Card.Section>
      </Card>
    )}
  </NewProductForm>
);

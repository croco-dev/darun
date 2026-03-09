"use client";

import { gql } from "@apollo/client";
import { useImageUpload } from "@darun/utils-image-upload";
import { FileWithPath } from "@mantine/dropzone";
import { useForm } from "@mantine/form";
import { notifications } from "@mantine/notifications";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useCreateMagazineOnWriteMagazineMutation } from "./__generated__/useWriteMagazine";

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
  const [createMagazine] = useCreateMagazineOnWriteMagazineMutation({
    onCompleted: ({ createMagazine }) => {
      notifications.show({ message: "생성되었습니다.", color: "teal" });
      push(`/magazines/${createMagazine.magazine.slug}`);
    },
  });
  const form = useForm<FormValues>({
    initialValues: {
      title: "",
      slug: "",
      summary: "",
      content: "",
      backgroundImageUrl: "",
    },
  });
  const { upload } = useImageUpload();
  const [isUploading, setIsUploading] = useState(false);
  const [file, setFile] = useState<File | null>(null);

  const handleSubmit = async (values: FormValues) => {
    await createMagazine({
      variables: {
        input: {
          title: values.title,
          slug: values.slug,
          summary: values.summary || "",
          backgroundImageUrl: values.backgroundImageUrl || "",
        },
      },
    });
  };

  const handleFileDrop = async (files: FileWithPath[]) => {
    const droppedFile = files[0];
    if (!droppedFile) return;

    setIsUploading(true);
    try {
      const imageUrl = await upload(
        "images/magazines",
        droppedFile,
        droppedFile.name,
      );
      setFile(droppedFile);
      form.setFieldValue("backgroundImageUrl", imageUrl);
      notifications.show({
        message: "이미지가 업로드되었습니다.",
        color: "teal",
      });
    } catch (error) {
      notifications.show({
        message: "이미지 업로드에 실패했습니다.",
        color: "red",
      });
    } finally {
      setIsUploading(false);
    }
  };

  const handleFileRemove = () => {
    setFile(null);
    form.setFieldValue("backgroundImageUrl", "");
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

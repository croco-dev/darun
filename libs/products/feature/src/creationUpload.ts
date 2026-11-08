export type CompletedCreationUpload = {
  file: File;
  folder: string;
  url: string;
};

export function getReusableCreationUploadUrl(
  completed: CompletedCreationUpload | null,
  file: File,
  folder: string
): string | undefined {
  return completed?.file === file && completed.folder === folder ? completed.url : undefined;
}

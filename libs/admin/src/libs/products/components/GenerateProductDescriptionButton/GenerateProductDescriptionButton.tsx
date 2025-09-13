import { Button } from '@mantine/core';
import { IconSparkles } from '@tabler/icons-react';
import { useGenerateProductDescriptionButton } from './useGenerateProductDescriptionButton';

interface GenerateProductDescriptionButtonProps {
  slug: string;
}

export function GenerateProductDescriptionButton({ slug }: GenerateProductDescriptionButtonProps) {
  const { handleGenerate, isGenerating, error } = useGenerateProductDescriptionButton(slug);

  return (
    <Button
      leftSection={<IconSparkles size={16} />}
      onClick={handleGenerate}
      loading={isGenerating}
      variant="outline"
      color="violet"
    >
      {isGenerating ? 'AI 소개 생성 중...' : 'AI 소개 생성'}
    </Button>
  );
}

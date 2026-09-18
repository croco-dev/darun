'use client';

import { Button, RefreshCw, Sparkles } from '@darun/ui';
import { useGenerateProductDescriptionButton } from './useGenerateProductDescriptionButton';

interface GenerateProductDescriptionButtonProps {
  slug: string;
}

export function GenerateProductDescriptionButton({ slug }: GenerateProductDescriptionButtonProps) {
  const { handleGenerate, isGenerating } = useGenerateProductDescriptionButton(slug);

  const handleClick = () => {
    handleGenerate().catch(() => {});
  };

  return (
    <Button
      onClick={handleClick}
      disabled={isGenerating}
      variant="contained"
      color="secondary"
      className="gap-2 border-yellow-200 bg-yellow-50 text-yellow-700"
    >
      {isGenerating ? (
        <RefreshCw size={16} className="animate-spin motion-reduce:animate-none" />
      ) : (
        <Sparkles size={16} />
      )}
      {isGenerating ? 'AI 소개 생성 중...' : 'AI 소개 생성'}
    </Button>
  );
}

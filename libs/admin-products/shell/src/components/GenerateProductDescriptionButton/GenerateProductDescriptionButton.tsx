import { Button } from "@darun/ui";
import { RefreshCw, Sparkles } from "lucide-react";
import { useGenerateProductDescriptionButton } from "./useGenerateProductDescriptionButton";

interface GenerateProductDescriptionButtonProps {
  slug: string;
}

export function GenerateProductDescriptionButton({
  slug,
}: GenerateProductDescriptionButtonProps) {
  const { handleGenerate, isGenerating } =
    useGenerateProductDescriptionButton(slug);

  return (
    <Button
      onClick={handleGenerate}
      disabled={isGenerating}
      variant="contained"
      color="secondary"
      className="gap-2 border-violet-200 bg-violet-50 text-violet-700"
    >
      {isGenerating ? (
        <RefreshCw size={16} className="animate-spin" />
      ) : (
        <Sparkles size={16} />
      )}
      {isGenerating ? "AI 소개 생성 중..." : "AI 소개 생성"}
    </Button>
  );
}

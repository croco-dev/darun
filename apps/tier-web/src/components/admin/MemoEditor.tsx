'use client';

import { updateAppMemo } from '@/app/admin/actions';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Save } from 'lucide-react';
import { useState } from 'react';

interface MemoEditorProps {
  appId: string;
  initialContent: string;
}

export function MemoEditor({ appId, initialContent }: MemoEditorProps) {
  const [content, setContent] = useState(initialContent);
  const [isSaving, setIsSaving] = useState(false);
  const { toast } = useToast();

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await updateAppMemo(appId, content);
      toast({
        title: '메모 저장 성공',
        description: '앱 메모가 업데이트되었습니다.',
      });
    } catch (error) {
      console.error('Failed to save memo:', error);
      toast({
        title: '메모 저장 실패',
        description: '메모를 저장하는 중 오류가 발생했습니다.',
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="flex flex-col gap-2 min-w-[200px]">
      <Textarea
        value={content}
        onChange={e => setContent(e.target.value)}
        placeholder="메모를 입력하세요..."
        className="min-h-[80px] text-sm resize-y"
      />
      <div className="flex justify-end">
        <Button size="sm" onClick={handleSave} disabled={isSaving || content === initialContent} variant="glass">
          {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          <span className="ml-2">저장</span>
        </Button>
      </div>
    </div>
  );
}

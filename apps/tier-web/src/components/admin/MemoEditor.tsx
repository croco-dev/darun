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
  const [memo, setMemo] = useState({
    receivedContent: initialContent,
    savedContent: initialContent,
    content: initialContent,
    serverChanged: false,
  });
  const [isSaving, setIsSaving] = useState(false);
  const { toast } = useToast();

  if (memo.receivedContent !== initialContent) {
    const isDirty = memo.content !== memo.savedContent;
    setMemo({
      receivedContent: initialContent,
      savedContent: initialContent,
      content: isDirty ? memo.content : initialContent,
      serverChanged: isDirty && memo.content !== initialContent,
    });
  }

  const isDirty = memo.content !== memo.savedContent;
  const showServerChange = memo.serverChanged && isDirty;

  const handleSave = async () => {
    if (isSaving || !isDirty) return;
    setIsSaving(true);
    try {
      const savedContent = await updateAppMemo(appId, memo.content);
      setMemo(current => ({
        ...current,
        savedContent,
        content: savedContent,
        serverChanged: false,
      }));
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
        aria-label="앱 메모"
        value={memo.content}
        onChange={e =>
          setMemo({
            ...memo,
            content: e.target.value,
            serverChanged: memo.serverChanged && e.target.value !== memo.savedContent,
          })
        }
        disabled={isSaving}
        placeholder="메모를 입력하세요..."
        className="min-h-[80px] text-sm resize-y"
      />
      {showServerChange && (
        <p role="status" className="text-sm text-muted-foreground">
          다른 곳에서 메모가 변경되었습니다. 작성 중인 내용은 유지됩니다. 저장하면 현재 입력으로 덮어씁니다.
        </p>
      )}
      <div className="flex justify-end">
        <Button type="button" size="sm" onClick={handleSave} disabled={isSaving || !isDirty} variant="glass">
          {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          <span className="ml-2">저장</span>
        </Button>
      </div>
    </div>
  );
}

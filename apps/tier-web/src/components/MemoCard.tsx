import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { createClient } from '@/utils/supabase/server';

interface MemoCardProps {
  appId: string;
}

export async function MemoCard({ appId }: MemoCardProps) {
  const supabase = await createClient();

  const { data: memo, error } = await supabase.from('memos').select('content').eq('app_id', appId).maybeSingle();

  if (!error && !memo?.content) {
    return null;
  }

  return (
    <Card variant="default" className="mt-4 gap-3 p-4 md:p-5">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base text-foreground">티어 메모</CardTitle>
      </CardHeader>
      <CardContent>
        {error ? (
          <p role="alert" className="text-sm text-destructive">
            메모를 불러오지 못했습니다.
          </p>
        ) : (
          <p className="whitespace-pre-wrap text-sm leading-6 text-muted-foreground">{memo?.content}</p>
        )}
      </CardContent>
    </Card>
  );
}

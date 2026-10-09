'use server';

import { requireAdmin } from '@/utils/admin';
import { createAdminClient, createClient } from '@/utils/supabase/server';
import { revalidatePath } from 'next/cache';
import { type AppStoreApp, parseAppleSearchResponse, parseAppStoreKeyword } from './app-store-search';

export async function updateTier(appId: string, tier: number) {
  await requireAdmin();
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) throw new Error('Unauthorized');

  const dbUser = await supabase.from('users').select('id,is_admin').eq('email', user.email).single();

  if (!dbUser?.data?.is_admin) throw new Error('Unauthorized');

  // Delete existing tier
  await supabase.from('tiers').delete().eq('app_id', appId);

  if (tier !== 0) {
    const { error } = await supabase.from('tiers').insert({
      app_id: appId,
      assigned_by: dbUser.data.id,
      tier: tier,
    });

    if (error) throw new Error(error.message);
  }

  revalidatePath('/admin');
  revalidatePath('/admin/tiers');
  revalidatePath('/');
  revalidatePath('/apps');
  revalidatePath('/apps/[id]', 'page');
}

export type AppStoreSearchState =
  | { status: 'idle'; message: '' }
  | {
      status: 'error';
      message: string;
      searched?: number;
      added?: number;
    }
  | {
      status: 'success';
      message: string;
      searched: number;
      added: number;
    };

export async function searchAndAddApps(
  _previousState: AppStoreSearchState,
  formData: FormData
): Promise<AppStoreSearchState> {
  await requireAdmin();

  const keyword = parseAppStoreKeyword(formData.get('keyword'));
  if (!keyword) {
    return {
      status: 'error',
      message: '검색어를 1자 이상 100자 이하로 입력해 주세요.',
    };
  }

  const url = new URL('https://itunes.apple.com/search');
  url.searchParams.set('term', keyword);
  url.searchParams.set('country', 'kr');
  url.searchParams.set('entity', 'software');
  url.searchParams.set('limit', '25');

  let apps: AppStoreApp[] | null;
  try {
    const response = await fetch(url);
    if (!response.ok) throw new Error('Apple Search API request failed');
    apps = parseAppleSearchResponse(await response.json());
  } catch {
    return {
      status: 'error',
      message: '앱 스토어 검색에 실패했습니다. 잠시 후 다시 시도해 주세요.',
    };
  }

  if (!apps) {
    return {
      status: 'error',
      message: '앱 스토어 검색에 실패했습니다. 잠시 후 다시 시도해 주세요.',
    };
  }

  if (apps.length === 0) {
    return {
      status: 'error',
      message: '검색 결과가 없습니다.',
      searched: 0,
      added: 0,
    };
  }

  try {
    const supabase = await createAdminClient();
    const { data, error } = await supabase
      .from('apps')
      .upsert(apps, {
        onConflict: 'app_store_id',
        ignoreDuplicates: true,
      })
      .select('id');

    if (error) {
      return {
        status: 'error',
        message: '앱을 저장하지 못했습니다. 잠시 후 다시 시도해 주세요.',
        searched: apps.length,
        added: 0,
      };
    }

    const added = data?.length ?? 0;
    if (added > 0) {
      revalidatePath('/admin');
      revalidatePath('/apps');
      revalidatePath('/');
    }

    return {
      status: 'success',
      message: `${apps.length}개 검색, ${added}개 추가했습니다.`,
      searched: apps.length,
      added,
    };
  } catch {
    return {
      status: 'error',
      message: '앱을 저장하지 못했습니다. 잠시 후 다시 시도해 주세요.',
      searched: apps.length,
      added: 0,
    };
  }
}

export async function updateAppMemo(appId: string, content: string) {
  await requireAdmin();
  const supabase = await createClient();
  const trimmedContent = content.trim();

  // Check if memo exists
  const { data: existingMemo, error: existingMemoError } = await supabase
    .from('memos')
    .select('id')
    .eq('app_id', appId)
    .maybeSingle();

  if (existingMemoError) {
    throw new Error(existingMemoError.message);
  }

  if (existingMemo) {
    if (!trimmedContent) {
      // If content is empty, delete the memo
      const { error } = await supabase.from('memos').delete().eq('id', existingMemo.id);

      if (error) {
        throw new Error(error.message);
      }
    } else {
      // Update existing memo
      const { error } = await supabase
        .from('memos')
        .update({
          content: trimmedContent,
          updated_at: new Date().toISOString(),
        })
        .eq('id', existingMemo.id);

      if (error) {
        throw new Error(error.message);
      }
    }
  } else if (trimmedContent) {
    // Insert new memo
    const { error } = await supabase.from('memos').insert({
      app_id: appId,
      content: trimmedContent,
    });

    if (error) {
      throw new Error(error.message);
    }
  }

  revalidatePath('/apps/[id]', 'page');
  revalidatePath('/admin');
  revalidatePath('/admin/tiers');
}

export async function deleteApp(appId: string) {
  await requireAdmin();
  const supabase = await createClient();

  // Delete related records first (cascade should handle this if configured, but doing it manually to be safe)
  await supabase.from('tiers').delete().eq('app_id', appId);
  await supabase.from('memos').delete().eq('app_id', appId);

  const { error } = await supabase.from('apps').delete().eq('id', appId);

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath('/admin');
  revalidatePath('/admin/tiers');
  revalidatePath('/');
  revalidatePath('/apps');
  revalidatePath('/apps/[id]', 'page');
}

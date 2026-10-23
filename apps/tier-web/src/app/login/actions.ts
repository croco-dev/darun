'use server';

import { createClient, createAdminClient } from '@/utils/supabase/server';
import { revalidatePath } from 'next/cache';
import { headers } from 'next/headers';
import { redirect } from 'next/navigation';

interface ActionState {
  error?: string;
  message?: string;
}

export async function login(prevState: ActionState, formData: FormData): Promise<ActionState> {
  const supabase = await createClient();

  const data = {
    email: formData.get('email') as string,
    password: formData.get('password') as string,
  };

  const { error } = await supabase.auth.signInWithPassword(data);

  if (error) {
    return { error: '로그인하지 못했습니다. 이메일과 비밀번호, 이메일 인증 여부를 확인해 주세요.' };
  }

  revalidatePath('/', 'layout');
  redirect('/');
}

export async function signup(prevState: ActionState, formData: FormData): Promise<ActionState> {
  const supabase = await createClient();
  const origin = (await headers()).get('origin');

  const data = {
    email: formData.get('email') as string,
    password: formData.get('password') as string,
    options: {
      emailRedirectTo: `${origin}/auth/callback`,
    },
  };

  const { data: authData, error } = await supabase.auth.signUp(data);

  if (error) {
    return { error: '회원가입을 완료하지 못했습니다. 이메일과 비밀번호를 확인한 뒤 다시 시도해 주세요.' };
  }

  if (authData.user) {
    const adminClient = await createAdminClient();
    const { error: insertError } = await adminClient.from('users').insert({
      id: authData.user.id,
      email: authData.user.email!,
    });

    if (insertError) {
      console.error('Error syncing user to public table:', insertError);
      // Optional: decide if you want to return an error here or just log it
    }
  }

  revalidatePath('/', 'layout');
  return {
    message:
      '가입 요청을 접수했습니다. 인증 이메일이 도착하면 링크를 열어 주세요. 이미 가입한 이메일이라면 로그인해 주세요.',
  };
}

export async function logout() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  revalidatePath('/', 'layout');
  redirect('/auth/signin');
}

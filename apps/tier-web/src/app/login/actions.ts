'use server';

import { ensureUserProfile } from '@/utils/ensure-user-profile';
import { createClient } from '@/utils/supabase/server';
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

  const { data: authData, error } = await supabase.auth.signInWithPassword(data);

  if (error) {
    return { error: '로그인하지 못했습니다. 이메일과 비밀번호, 이메일 인증 여부를 확인해 주세요.' };
  }

  if (!authData.user || !(await ensureUserProfile(authData.user))) {
    redirect('/auth/profile-sync');
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

  // Supabase can return an obfuscated user for an existing confirmed email.
  if (authData.user && authData.user.identities?.length !== 0 && !(await ensureUserProfile(authData.user))) {
    redirect('/auth/profile-sync');
  }

  revalidatePath('/', 'layout');
  return {
    message:
      '가입 요청을 접수했습니다. 인증 이메일이 도착하면 링크를 열어 주세요. 이미 가입한 이메일이라면 로그인해 주세요.',
  };
}

export async function retryUserProfile(): Promise<ActionState> {
  const supabase = await createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();
  if (error || !user) {
    return { error: '이메일 인증을 마친 뒤 같은 계정으로 로그인해 주세요. 계정을 다시 만들 필요는 없습니다.' };
  }
  if (!(await ensureUserProfile(user))) {
    return { error: '앱 사용자 정보를 아직 연결하지 못했습니다. 잠시 후 다시 시도해 주세요.' };
  }
  revalidatePath('/', 'layout');
  redirect('/');
}

export async function logout() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  revalidatePath('/', 'layout');
  redirect('/auth/signin');
}

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
    return { error: error.message };
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
    return { error: error.message };
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
  return { message: '회원가입이 완료되었습니다. 이메일 인증을 진행해 주세요.' };
}

export async function logout() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  revalidatePath('/', 'layout');
  redirect('/auth/signin');
}

import { createClient } from '@/utils/supabase/server';
import { redirect } from 'next/navigation';

export async function checkIsAdmin() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return false;
  }

  const { data } = await supabase.from('users').select('is_admin').eq('email', user.email).single();

  return data?.is_admin || false;
}

export async function requireAdmin() {
  const isAdmin = await checkIsAdmin();
  if (!isAdmin) {
    redirect('/');
  }
}

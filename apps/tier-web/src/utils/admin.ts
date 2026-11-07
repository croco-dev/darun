import { createClient } from '@/utils/supabase/server';
import { isAuthSessionMissingError } from '@supabase/supabase-js';
import { redirect, unstable_rethrow } from 'next/navigation';

export class AdminAccessError extends Error {
  constructor() {
    super('관리자 권한을 확인하지 못했습니다. 잠시 후 다시 시도해 주세요.');
    this.name = 'AdminAccessError';
  }
}

async function getAdminUser() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError) {
      if (isAuthSessionMissingError(authError)) return null;
      throw authError;
    }
    if (!user?.email) return null;

    const { data, error } = await supabase.from('users').select('id,is_admin').eq('email', user.email).maybeSingle();
    if (error) throw error;
    return data?.is_admin === true ? data : null;
  } catch (error) {
    unstable_rethrow(error);
    throw new AdminAccessError();
  }
}

export async function checkIsAdmin() {
  return (await getAdminUser()) !== null;
}

export async function requireAdmin() {
  const admin = await getAdminUser();
  if (!admin) redirect('/');
  return admin;
}

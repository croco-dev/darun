import { createAdminClient } from '@/utils/supabase/server';
import type { User } from '@supabase/supabase-js';

// Call only with a user returned by the authentication provider, never form data.
export async function ensureUserProfile(user: Pick<User, 'id' | 'email'>): Promise<boolean> {
  if (!user.id || !user.email) return false;
  try {
    const supabase = await createAdminClient();
    const { error } = await supabase
      .from('users')
      .upsert({ id: user.id, email: user.email }, { onConflict: 'id', ignoreDuplicates: true });
    return error === null;
  } catch {
    return false;
  }
}

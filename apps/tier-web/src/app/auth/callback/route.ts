import { getAuthRedirect } from '@/utils/auth-redirect';
import { ensureUserProfile } from '@/utils/ensure-user-profile';
import { createClient } from '@/utils/supabase/server';
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  const next = searchParams.get('next') ?? '/';

  if (code) {
    const supabase = await createClient();
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      if (!data.user || !(await ensureUserProfile(data.user))) {
        return NextResponse.redirect(`${origin}/auth/profile-sync`);
      }
      return NextResponse.redirect(getAuthRedirect(next, origin));
    }
  }

  // return the user to an error page with instructions
  return NextResponse.redirect(`${origin}/auth/auth-code-error`);
}

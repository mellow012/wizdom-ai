import { NextResponse, type NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get('code');
  const next = requestUrl.searchParams.get('next') ?? '/auth/update-password';

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
      return NextResponse.redirect(new URL(next, request.url));
    }

    console.error('Auth callback exchange failed:', error);
  }

  const updateUrl = new URL('/auth/update-password', request.url);
  updateUrl.searchParams.set('error', code ? 'expired_reset_link' : 'invalid_reset_link');
  return NextResponse.redirect(updateUrl);
}

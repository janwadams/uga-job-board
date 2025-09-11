import { createMiddlewareClient } from '@supabase/auth-helpers-nextjs';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export async function middleware(req: NextRequest) {
  const res = NextResponse.next();

  console.log('Middleware started for request:', req.url);

  const supabase = createMiddlewareClient({ req, res });

  const {
    data: { session },
    error: sessionError,
  } = await supabase.auth.getSession();

  console.log('Middleware Session:', session);
  console.log('Middleware Session Error:', sessionError);

  if (sessionError || !session) {
    console.log('Middleware: No session found. Redirecting to login.');
    const loginUrl = new URL('/login', req.url);
    return NextResponse.redirect(loginUrl);
  }

  return res;
}

export const config = {
  matcher: ['/rep/create', '/rep/dashboard', '/faculty/create'],
};

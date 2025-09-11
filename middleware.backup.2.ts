import { createMiddlewareClient } from '@supabase/auth-helpers-nextjs';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export async function middleware(req: NextRequest) {
  const res = NextResponse.next();
  const supabase = createMiddlewareClient({ req, res });

  // This log will show in your Vercel logs every time the middleware runs.
  // We want to see if a session is found here.
  const { data: { session }, error: sessionError } = await supabase.auth.getSession();
  console.log('Middleware Session:', session);
  console.log('Middleware Session Error:', sessionError);
  
  if (sessionError) {
    console.error('Middleware session retrieval failed:', sessionError);
  }

  // Refreshing the session ensures it is always up-to-date
  await supabase.auth.getUser();

  return res;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * Feel free to modify this pattern to include more paths.
     */
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
};

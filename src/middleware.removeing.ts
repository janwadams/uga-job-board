import { createMiddlewareClient } from '@supabase/auth-helpers-nextjs';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export async function middleware(req: NextRequest) {
  const res = NextResponse.next();
  const supabase = createMiddlewareClient({ req, res });

  // Get the authenticated user's session
  const {
    data: { session },
    error: sessionError,
  } = await supabase.auth.getSession();

  // Log the session and any errors for debugging
  console.log('Middleware Session:', session);
  console.log('Middleware Session Error:', sessionError);
  console.log('Middleware Request URL:', req.nextUrl.pathname);

  // If there's no session and the user is on a protected page, redirect to login
  if (!session && req.nextUrl.pathname.startsWith('/rep')) {
    return NextResponse.redirect(new URL('/login', req.url));
  }
  if (!session && req.nextUrl.pathname.startsWith('/faculty')) {
    return NextResponse.redirect(new URL('/login', req.url));
  }


  // If there's a session and the user is on the login page, redirect to the dashboard
  if (session && req.nextUrl.pathname === '/login') {
    const { data: roleData } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', session.user.id)
      .single();

    if (roleData) {
      const role = roleData.role;
      if (role === 'rep') {
        return NextResponse.redirect(new URL('/rep/dashboard', req.url));
      }
      if (role === 'faculty') {
        return NextResponse.redirect(new URL('/faculty/dashboard', req.url));
      }
    }

    return NextResponse.redirect(new URL('/', req.url));
  }

  // If the user's session and role is valid, we can set up the role and continue.
  if (session) {
    const { data: roleData, error: roleError } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', session.user.id)
      .single();

    if (roleError || !roleData) {
      console.error('Role check failed in middleware:', roleError?.message);
      return NextResponse.redirect(new URL('/unauthorized', req.url));
    }

    const role = roleData.role;
    if (role === 'rep' && !req.nextUrl.pathname.startsWith('/rep')) {
      return NextResponse.redirect(new URL('/rep/dashboard', req.url));
    }
    if (role === 'faculty' && !req.nextUrl.pathname.startsWith('/faculty')) {
      return NextResponse.redirect(new URL('/faculty/dashboard', req.url));
    }
  }

  return res;
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};

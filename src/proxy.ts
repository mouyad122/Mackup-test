import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { updateSession } from './utils/supabase/middleware';

const SESSION_COOKIE_NAME = 'makeup_session';

export default async function proxy(request: NextRequest) {
  // Update Supabase session and get the base response with potentially refreshed cookies
  const supabaseResponse = await updateSession(request);

  const { pathname } = request.nextUrl;
  const sessionToken = request.cookies.get(SESSION_COOKIE_NAME)?.value;
  const roleCookie = request.cookies.get('makeup_role')?.value;

  const isAdminRoute = pathname.startsWith('/admin') && !pathname.startsWith('/admin/login');
  if (/^\/(?:ar\/|en\/)?pos(?:\/|$)/.test(pathname)) return new NextResponse('Not Found', { status: 404 });
  // These modules do not exist in the currently deployed Prisma schema. Keep
  // their unfinished routes private instead of allowing them to crash at
  // runtime. Financial, sales, expense, and settlement routes are supported
  // by the current schema and must remain reachable.
  if (pathname.startsWith('/admin/customers') || pathname.startsWith('/admin/reviews')) {
    return new NextResponse('Not Found', { status: 404 });
  }

  let finalResponse = supabaseResponse;

  function redirectWithCookies(url: URL) {
    const res = NextResponse.redirect(url);
    // Copy cookies set by Supabase
    supabaseResponse.cookies.getAll().forEach(cookie => {
      res.cookies.set(cookie.name, cookie.value);
    });
    return res;
  }

  // 2. Absolute POS Cashier Isolation (P2-002)
  if (isAdminRoute && roleCookie === 'Cashier') {
    // Cashiers are completely isolated to /pos
    return redirectWithCookies(new URL('/admin/dashboard', request.url));
  }

  // Early routing check: if accessing protected routes without a cookie, redirect immediately.
  if (isAdminRoute && !sessionToken) {
    return redirectWithCookies(new URL('/admin/login', request.url));
  }

  // Locale handling logic
  const isPublicRoute = !pathname.startsWith('/admin') && !pathname.startsWith('/delivery/');
  if (isPublicRoute) {
    if (pathname === '/') {
      return redirectWithCookies(new URL('/ar', request.url));
    }
    
    // If it doesn't start with /ar or /en, redirect to /ar/path
    const localeMatch = pathname.match(/^\/(ar|en)(\/|$)/);
    if (!localeMatch) {
      return redirectWithCookies(new URL(`/ar${pathname}`, request.url));
    }
  }

  return finalResponse;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - sitemap.xml (sitemap file)
     * - robots.txt (robots file)
     * - logo.png and any other static files
     */
    '/((?!api|_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};

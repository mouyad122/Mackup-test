import React from 'react';
import Link from 'next/link';
import { requireAuth } from '@/lib/dal';
import { logout } from '@/actions/auth';

export default async function AdminLayout({
  children
}: {
  children: React.ReactNode;
}) {
  // Enforce auth globally for admin dashboard except login page
  // Note: login page is located at /admin/login, which is wrapped by this layout.
  // We can skip authentication enforcement inside the pages themselves or check if we are on the login route.
  // But wait, requireAuth throws and redirects to /admin/login. If this layout runs requireAuth, it will redirect
  // infinite loop for /admin/login!
  // To avoid this, we shouldn't run requireAuth in this layout. We should run it inside each sub-page component,
  // or check if it's not login. But layout is a Server Component and doesn't know the pathname natively in Next.js!
  // So we run requireAuth in the individual pages.
  // We can still display the sidebar wrapper here, but conditionally hide it on the login page by checking if the page is self-contained.
  // Alternatively, we can let children be rendered directly, and inside the dashboard pages we wrap them in an AdminLayout wrapper.
  // Wait! That is the cleanest solution in Next.js! It allows the login page to have a clean simple card layout, while dashboard pages have the sidebar!
  
  return (
    <div className="min-h-screen bg-zinc-50 text-zinc-900 font-sans">
      {children}
    </div>
  );
}

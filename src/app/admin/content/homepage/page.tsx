import React from 'react';
import { requireAuth, requirePermission } from '@/lib/dal';
import { AdminSidebar } from '@/components/AdminSidebar';
import Link from 'next/link';
import { prisma } from '@/lib/db';
import { getHeroSlides, getHeroCarouselSettings, getStoreLocationSettings } from '@/actions/homepage-cms';
import { CMSHomepageForm } from '@/components/CMSHomepageForm';

export default async function AdminCMSHomepagePage() {
  const session = await requireAuth();
  await requirePermission('manage:settings'); // Enforce admin settings permission

  // Load select options for slide links
  const products = await prisma.product.findMany({
    where: { isVisible: true },
    orderBy: { nameAr: 'asc' },
    select: { id: true, nameAr: true }
  });

  const categories = await prisma.category.findMany({
    orderBy: { name: 'asc' },
    select: { id: true, name: true }
  });



  // Load current page CMS configurations
  const carouselSettings = await getHeroCarouselSettings();
  const slides = await getHeroSlides();
  const locationSettings = await getStoreLocationSettings();

  return (
    <div className="flex min-h-screen bg-[var(--color-ivory-100)] text-zinc-800" dir="rtl">
      <AdminSidebar employeeName={session.employee.name} roleName={session?.employee?.role?.name || "ADMIN"} />
      
      <main className="flex-1 p-6 md:p-12 font-sans w-full max-w-6xl mx-auto space-y-6">
        <div className="flex items-center gap-4">
          <Link href="/admin/content" className="bg-white border border-zinc-200 hover:bg-zinc-100 text-zinc-700 p-2 rounded-lg transition-colors flex items-center justify-center shadow-sm shrink-0" title="الرجوع للصفحة السابقة">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m9 18 6-6-6-6"/></svg>
          </Link>
          <div>
            <h1 className="text-2xl font-bold font-heading text-[var(--color-charcoal-900)]">إدارة الصفحة الرئيسية والمحتوى</h1>
            <p className="text-xs text-zinc-500 mt-1">التحكم في لافتات الإعلانات الترويجية وتحديد موقع المتجر الجغرافي المعروض.</p>
          </div>
        </div>

        <CMSHomepageForm 
          carouselSettings={carouselSettings}
          slides={slides}
          locationSettings={locationSettings}
          products={products}
          categories={categories}
          adminId={session.employeeId}
        />
      </main>
    </div>
  );
}

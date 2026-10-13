import React from 'react';
import { requireAuth } from '@/lib/dal';
import { prisma } from '@/lib/db';
import { AdminSidebar } from '@/components/AdminSidebar';
import { AdminReviewsClient } from './AdminReviewsClient';

export default async function AdminReviewsPage() {
  const session = await requireAuth();

  const reviews = await prisma.review.findMany({
    orderBy: { createdAt: 'desc' },
    include: {
      product: true,
      customer: true
    }
  });

  return (
    <div className="flex flex-col md:flex-row h-screen bg-[var(--color-ivory-100)] overflow-hidden" dir="rtl">
      <AdminSidebar employeeName={session.employee.name} roleName={session?.employee?.role?.name || "ADMIN"} />
      
      <main className="flex-1 overflow-y-auto p-4 md:p-8 w-full">
        <header className="mb-8">
          <h1 className="text-3xl font-bold text-zinc-900">المراجعات والتقييمات</h1>
          <p className="mt-1 text-sm text-zinc-600">
            إدارة تقييمات العملاء للمنتجات.
          </p>
        </header>

        <AdminReviewsClient initialReviews={reviews} />
      </main>
    </div>
  );
}

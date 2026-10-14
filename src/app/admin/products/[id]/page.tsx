import React from 'react';
import Link from 'next/link';
import { requirePermission } from '@/lib/dal';
import { prisma } from '@/lib/db';
import { AdminSidebar } from '@/components/AdminSidebar';
import { ProductCatalogForm } from '@/components/ProductCatalogForm';
import { getSupplierProfitMargin } from '@/lib/supplier-margin';
import { notFound } from 'next/navigation';

export default async function AdminProductEditPage({
  params
}: {
  params: Promise<{ id: string }>
}) {
  const session = await requirePermission('manage:products');
  const user = await prisma.employee.findUnique({
    where: { id: session.employeeId },
    include: { role: true }
  });

  const { id } = await params;

  const product = await prisma.product.findUnique({
    where: { id },
    include: {
      category: true,
      images: true,
      variants: { orderBy: { createdAt: 'asc' }, include: { supplierOffers: { include: { supplier: true }, orderBy: { unitCost: 'asc' } } } },
    }
  });

  if (!product) notFound();

  const categories = await prisma.category.findMany({ orderBy: { name: 'asc' } });
  const supplierRows = await prisma.supplier.findMany({ where: { isActive: true }, orderBy: { name: 'asc' }, select: { id: true, name: true } });
  const suppliers = await Promise.all(supplierRows.map(async supplier => ({ ...supplier, profitMargin: await getSupplierProfitMargin(prisma, supplier.id) })));
  const activity = await prisma.auditLog.findMany({
    where: { entityType: 'PRODUCT', entityId: product.id },
    include: { employee: { select: { name: true } } },
    orderBy: { createdAt: 'desc' },
    take: 8,
  });
  const actionLabel: Record<string, string> = { CREATE_PRODUCT: 'تمت إضافة المنتج', UPDATE_PRODUCT: 'تم تعديل بيانات المنتج' };

  const initialData = {
    nameAr: product.nameAr,
    nameEn: product.nameEn || '',
    sku: product.sku,
    shortDescription: product.shortDescription,
    longDescription: product.longDescription,
    isVisible: product.isVisible,
    isFeatured: product.isFeatured,
    categoryId: product.categoryId,
    variants: product.variants.map(v => {
      const activeOffer = v.supplierOffers.find(o => o.isActive && o.supplier.isActive);
      return {
        id: v.id,
        size: v.size,
        sku: v.sku,
        price: v.price,
        isActive: v.isActive,
        inventorySource: v.inventorySource as 'INTERNAL' | 'SUPPLIER',
        supplierId: activeOffer?.supplierId || '',
        supplierUnitCost: activeOffer ? (activeOffer.unitCost / 1000).toFixed(3) : '',
        supplierOfferUpdatedAt: activeOffer?.updatedAt.toISOString() || null,
      };
    }),
    images: product.images.map(img => ({
      id: img.id,
      url: img.url,
      isMain: img.isMain
    })),
  };

  return (
    <div className="flex flex-col md:flex-row h-screen bg-[var(--color-ivory-100)] overflow-hidden" dir="rtl">
      <AdminSidebar employeeName={user?.name || ''} roleName={"ADMIN"} />

      <main className="flex-1 overflow-y-auto p-8 font-sans w-full max-w-full">
        <div className="mb-8 border-b border-[var(--color-ivory-200)] pb-4">
          <div className="flex items-center gap-3 mb-2">
            <Link href="/admin/products" className="text-sm text-zinc-500 hover:underline">المنتجات</Link>
            <span className="text-zinc-300">/</span>
            <span className="text-sm font-bold text-zinc-700">تعديل المنتج</span>
          </div>
          <h1 className="text-3xl font-bold font-heading text-[#3F4B32]">
            تعديل: {product.nameAr}
          </h1>
        </div>

        <ProductCatalogForm
          productId={product.id}
          initialData={initialData}
          categories={categories.map(c => ({ id: c.id, name: c.name }))}
          suppliers={suppliers}
        />
        <section className="mt-8 overflow-hidden rounded-lg border bg-white">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b p-4"><div><h2 className="font-bold">اتفاقات الموردين حسب الدرجة</h2><p className="text-xs text-zinc-500">المورد والكلفة ونسبة المشاركة تُحفظ مع كل طلب. حالة التوفر تُدار يدوياً من كل درجة أعلاه.</p></div><Link className="text-sm underline" href="/admin/suppliers">إدارة الموردين</Link></div>
          <div className="overflow-x-auto"><table className="w-full min-w-[620px] text-right text-sm"><thead className="bg-zinc-50"><tr><th className="p-3">المقاس</th><th className="p-3">المورد</th><th className="p-3">تكلفة الوحدة</th><th className="p-3">حصة المورد</th><th className="p-3">حصة المنصة</th><th className="p-3">الحالة</th></tr></thead><tbody className="divide-y">{product.variants.flatMap(v=>v.supplierOffers.map(offer=><tr key={offer.id}><td className="p-3">{v.size}</td><td className="p-3">{offer.supplier.name}</td><td className="p-3">{(offer.unitCost/1000).toFixed(3)} د.أ</td><td className="p-3">{(offer.supplierProfitShareBps/100).toFixed(2)}%</td><td className="p-3">{((10000-offer.supplierProfitShareBps)/100).toFixed(2)}%</td><td className="p-3">{offer.isActive&&offer.supplier.isActive?'فعال':'متوقف'}</td></tr>))}</tbody></table></div>
        </section>
        <section className="mt-8 rounded-lg border bg-white p-5">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b pb-3"><div><h2 className="font-bold">تاريخ هذا المنتج</h2><p className="mt-1 text-xs text-zinc-500">آخر تعديلات الاسم والوصف والأسعار والصور الخاصة بهذا المنتج.</p></div><Link href={`/admin/logs?type=products&entityId=${product.id}`} className="text-sm font-semibold underline">عرض كل السجل</Link></div>
          <div className="mt-3 space-y-2">{activity.map(log => <div key={log.id} className="flex flex-wrap justify-between gap-2 rounded bg-zinc-50 p-3 text-sm"><span>{actionLabel[log.action] || log.action} <span className="text-zinc-500">بواسطة {log.employee?.name || 'النظام'}</span></span><span className="text-xs text-zinc-500">{new Date(log.createdAt).toLocaleString('ar-JO')}</span></div>)}{!activity.length && <p className="py-3 text-sm text-zinc-500">لا توجد عمليات مسجلة لهذا المنتج بعد.</p>}</div>
        </section>
      </main>
    </div>
  );
}

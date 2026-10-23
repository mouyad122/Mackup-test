import React from 'react';
import Link from 'next/link';
import { requirePermission } from '@/lib/dal';
import { prisma } from '@/lib/db';
import { AdminSidebar } from '@/components/AdminSidebar';
import { UnifiedProductManager } from '@/components/UnifiedProductManager';
import { getSupplierProfitMargin } from '@/lib/supplier-margin';
import { notFound } from 'next/navigation';
import { ensureProductTemplatesInstalled } from '@/lib/product-templates';
import { ensureDefaultTaxonomyInstalled } from '@/lib/taxonomy-defaults';

export default async function AdminProductEditPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await requirePermission('manage:products');
  const user = await prisma.employee.findUnique({
    where: { id: session.employeeId },
    include: { role: true },
  });

  const { id } = await params;

  // Ensure default templates & taxonomy exist
  await ensureProductTemplatesInstalled();
  await ensureDefaultTaxonomyInstalled();

  const product = await prisma.product.findUnique({
    where: { id },
    include: {
      category: true,
      images: true,
      attributeValues: true,
      variants: {
        orderBy: { createdAt: 'asc' },
        include: { supplierOffers: { include: { supplier: true }, orderBy: { unitCost: 'asc' } } },
      },
    },
  });

  if (!product) notFound();

  const categories = await prisma.category.findMany({
    orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
  });
  const brands = await prisma.brand.findMany({
    where: { isVisible: true },
    orderBy: { nameAr: 'asc' },
    select: { id: true, nameAr: true, nameEn: true },
  });
  const templates = await prisma.productTemplate.findMany({
    where: { isActive: true },
    include: {
      fields: {
        include: { attributeDefinition: true },
        orderBy: { sortOrder: 'asc' },
      },
    },
    orderBy: { nameAr: 'asc' },
  });

  const supplierRows = await prisma.supplier.findMany({
    where: { isActive: true },
    orderBy: { name: 'asc' },
    select: { id: true, name: true },
  });
  const suppliers = await Promise.all(
    supplierRows.map(async supplier => ({
      ...supplier,
      profitMargin: await getSupplierProfitMargin(prisma, supplier.id),
    }))
  );

  const activity = await prisma.auditLog.findMany({
    where: { entityType: 'PRODUCT', entityId: product.id },
    include: { employee: { select: { name: true } } },
    orderBy: { createdAt: 'desc' },
    take: 8,
  });
  const actionLabel: Record<string, string> = {
    CREATE_PRODUCT: 'تمت إضافة المنتج',
    UPDATE_PRODUCT: 'تم تعديل بيانات المنتج',
    DUPLICATE_PRODUCT: 'تم تكرار المنتج',
  };

  const attributeMap: Record<string, string> = {};
  for (const av of product.attributeValues) {
    try {
      const parsed = JSON.parse(av.valueJson);
      attributeMap[av.attributeDefinitionId] = String(parsed ?? '');
    } catch {
      attributeMap[av.attributeDefinitionId] = av.valueJson;
    }
  }

  const initialData = {
    nameAr: product.nameAr,
    nameEn: product.nameEn || '',
    categoryId: product.categoryId,
    brandId: product.brandId,
    productTemplateId: product.productTemplateId,
    attributeValues: attributeMap,
    shortDescription: product.shortDescription,
    longDescription: product.longDescription,
    isVisible: product.isVisible,
    isFeatured: product.isFeatured,
    isBestSeller: product.isBestSeller,
    isNew: product.isNew,
    isTrending: product.isTrending,
    tags: product.tags,
    barcode: product.barcode,
    ingredients: product.ingredients,
    howToUse: product.howToUse,
    warnings: product.warnings,
    finish: product.finish,
    coverage: product.coverage,
    skinType: product.skinType,
    benefits: product.benefits,
    inventoryMode: product.inventoryMode,
    variants: product.variants.map(v => {
      const activeOffer = v.supplierOffers.find(o => o.isActive && o.supplier.isActive);
      return {
        id: v.id,
        size: v.size,
        sku: v.sku,
        price: v.price,
        compareAt: v.compareAt,
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
      isMain: img.isMain,
    })),
  };

  return (
    <div className="flex flex-col md:flex-row h-screen bg-[var(--color-ivory-100)] overflow-hidden" dir="rtl">
      <AdminSidebar employeeName={user?.name || ''} roleName={user?.role?.name || 'ADMIN'} />

      <main className="flex-1 overflow-y-auto p-4 md:p-8 font-sans w-full max-w-full">
        <div className="mb-8 border-b border-[var(--color-ivory-200)] pb-4">
          <div className="flex items-center gap-3 mb-2">
            <Link href="/admin/products" className="text-sm text-zinc-500 hover:underline">
              المنتجات
            </Link>
            <span className="text-zinc-300">/</span>
            <span className="text-sm font-bold text-zinc-700">تعديل المنتج</span>
          </div>
          <h1 className="text-3xl font-bold font-heading text-[#3F4832]">
            تعديل: {product.nameAr}
          </h1>
          <p className="text-xs text-zinc-500 mt-1">
            الرمز التعريفي الفريد: <span className="font-mono text-zinc-700">{product.sku}</span> | الحالة: {product.isVisible ? 'منشور 🟢' : 'مسودة 🟡'}
          </p>
        </div>

        <UnifiedProductManager
          productId={product.id}
          initialData={initialData}
          categories={categories.map(c => ({
            id: c.id,
            name: c.name,
            slug: c.slug,
            parentId: c.parentId,
            defaultTemplateId: c.defaultTemplateId,
          }))}
          brands={brands}
          suppliers={suppliers}
          templates={templates}
        />


        <section className="mt-8 overflow-hidden rounded-lg border bg-white">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b p-4">
            <div>
              <h2 className="font-bold">اتفاقات الموردين حسب الدرجة</h2>
              <p className="text-xs text-zinc-500">
                المورد والكلفة ونسبة المشاركة تُحفظ مع كل طلب. حالة التوفر تُدار يدوياً من كل درجة أعلاه.
              </p>
            </div>
            <Link className="text-sm underline text-[#3F4832] font-semibold" href="/admin/suppliers">
              إدارة الموردين
            </Link>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[620px] text-right text-sm">
              <thead className="bg-zinc-50 text-zinc-600">
                <tr>
                  <th className="p-3">المقاس / الدرجة</th>
                  <th className="p-3">المورد</th>
                  <th className="p-3">تكلفة الوحدة</th>
                  <th className="p-3">حصة المورد</th>
                  <th className="p-3">حصة المنصة</th>
                  <th className="p-3">الحالة</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {product.variants.flatMap(v =>
                  v.supplierOffers.map(offer => (
                    <tr key={offer.id}>
                      <td className="p-3 font-medium">{v.size}</td>
                      <td className="p-3">{offer.supplier.name}</td>
                      <td className="p-3">{(offer.unitCost / 1000).toFixed(3)} د.أ</td>
                      <td className="p-3">{(offer.supplierProfitShareBps / 100).toFixed(2)}%</td>
                      <td className="p-3">{((10000 - offer.supplierProfitShareBps) / 100).toFixed(2)}%</td>
                      <td className="p-3">
                        <span className={`inline-flex px-2 py-0.5 rounded text-xs font-bold ${offer.isActive && offer.supplier.isActive ? 'bg-green-100 text-green-800' : 'bg-zinc-100 text-zinc-600'}`}>
                          {offer.isActive && offer.supplier.isActive ? 'فعال' : 'متوقف'}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>

        <section className="mt-8 rounded-lg border bg-white p-5">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b pb-3">
            <div>
              <h2 className="font-bold">سجل التعديلات</h2>
              <p className="mt-1 text-xs text-zinc-500">
                آخر تعديلات الاسم والوصف والأسعار والصور الخاصة بهذا المنتج.
              </p>
            </div>
            <Link
              href={`/admin/logs?type=products&entityId=${product.id}`}
              className="text-sm font-semibold underline text-[#3F4832]"
            >
              عرض كل السجل
            </Link>
          </div>
          <div className="mt-3 space-y-2">
            {activity.map(log => (
              <div
                key={log.id}
                className="flex flex-wrap justify-between gap-2 rounded bg-zinc-50 p-3 text-sm"
              >
                <span>
                  {actionLabel[log.action] || log.action}{' '}
                  <span className="text-zinc-500">بواسطة {log.employee?.name || 'النظام'}</span>
                </span>
                <span className="text-xs text-zinc-500 font-mono" dir="ltr">
                  {new Date(log.createdAt).toLocaleString('en-GB')}
                </span>
              </div>
            ))}
            {!activity.length && (
              <p className="py-3 text-sm text-zinc-500">لا توجد عمليات مسجلة لهذا المنتج بعد.</p>
            )}
          </div>
        </section>
      </main>
    </div>
  );
}

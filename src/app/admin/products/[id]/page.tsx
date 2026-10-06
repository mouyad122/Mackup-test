import React from 'react';
import Link from 'next/link';
import { requirePermission } from '@/lib/dal';
import { prisma } from '@/lib/db';
import { AdminSidebar } from '@/components/AdminSidebar';
import { ProductEditForm } from '@/components/ProductEditForm';
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
      brand: true,
      images: true,
      variants: { orderBy: { createdAt: 'asc' }, include: { supplierOffers: { include: { supplier: true }, orderBy: { unitCost: 'asc' } } } },
      similarProducts: { include: { similar: { include: { images: { where: { isMain: true }, take: 1 } } } }, orderBy: { order: 'asc' } },
    }
  });

  if (!product) notFound();

  const categories = await prisma.category.findMany({ orderBy: { name: 'asc' } });
  const brands = await prisma.brand.findMany({ orderBy: { nameEn: 'asc' } });

  // All products except this one (for similar products selection)
  const allProducts = await prisma.product.findMany({
    where: { id: { not: id }, isVisible: true },
    include: { images: { where: { isMain: true }, take: 1 } },
    orderBy: { nameAr: 'asc' },
  });

  const initialData = {
    nameAr: product.nameAr,
    nameEn: product.nameEn || '',
    sku: product.sku,
    shortDescription: product.shortDescription,
    longDescription: product.longDescription,
    isVisible: product.isVisible,
    isFeatured: product.isFeatured,
    categoryId: product.categoryId,
    brandId: product.brandId,
    productType: product.productType,
    finish: product.finish,
    coverage: product.coverage,
    skinType: product.skinType,
    benefits: product.benefits,
    ingredients: product.ingredients,
    howToUse: product.howToUse,
    variants: product.variants.map(v => ({
      id: v.id,
      name: v.name,
      sku: v.sku,
      price: v.price,
      colorHex: v.colorHex,
      stock: v.stock,
      isActive: v.isActive,
      inventorySource: v.inventorySource as 'INTERNAL' | 'SUPPLIER',
    })),
    images: product.images.map(img => ({
      id: img.id,
      url: img.url,
      isMain: img.isMain
    })),
    similarProductIds: product.similarProducts.map(sp => sp.similarId),
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
          <h1 className="text-3xl font-bold font-heading text-[var(--color-charcoal-900)]">
            تعديل: {product.nameAr}
          </h1>
        </div>

        <ProductEditForm
          productId={product.id}
          initialData={initialData}
          categories={categories.map(c => ({ id: c.id, name: c.name }))}
          brands={brands.map(b => ({ id: b.id, nameAr: b.nameAr, nameEn: b.nameEn }))}
          allProducts={allProducts.map(p => ({
            id: p.id,
            nameAr: p.nameAr,
            nameEn: p.nameEn,
            sku: p.sku,
            imageUrl: p.images[0]?.url || null,
          }))}
        />
        <section className="mt-8 overflow-hidden rounded-lg border bg-white">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b p-4"><div><h2 className="font-bold">عروض الموردين حسب الدرجة</h2><p className="text-xs text-zinc-500">عند إنشاء الطلب يختار النظام أقل تكلفة عرض نشط ومتوفر؛ التكاليف ونسب المشاركة تُحفظ في لقطة الطلب.</p></div><Link className="text-sm underline" href="/admin/suppliers">إدارة العروض والمخزون</Link></div>
          <div className="overflow-x-auto"><table className="w-full min-w-[700px] text-right text-sm"><thead className="bg-zinc-50"><tr><th className="p-3">الدرجة</th><th className="p-3">المورد</th><th className="p-3">تكلفة الوحدة</th><th className="p-3">حصة المورد</th><th className="p-3">حصة المنصة</th><th className="p-3">المخزون</th><th className="p-3">الحالة</th></tr></thead><tbody className="divide-y">{product.variants.flatMap(v=>v.supplierOffers.map(offer=><tr key={offer.id}><td className="p-3">{v.name}</td><td className="p-3">{offer.supplier.name}</td><td className="p-3">{(offer.unitCost/1000).toFixed(3)} د.أ</td><td className="p-3">{(offer.supplierProfitShareBps/100).toFixed(2)}%</td><td className="p-3">{((10000-offer.supplierProfitShareBps)/100).toFixed(2)}%</td><td className="p-3">{offer.stock}</td><td className="p-3">{offer.isActive&&offer.supplier.isActive?'فعال':'متوقف'}</td></tr>))}</tbody></table></div>
        </section>
      </main>
    </div>
  );
}

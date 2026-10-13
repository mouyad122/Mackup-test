'use server';

import type { Prisma } from '@prisma/client';
import { prisma } from '@/lib/db';
import { requirePermission } from '@/lib/dal';
import { uploadMedia } from '@/actions/upload';
import { assignProductSupplier, productSupplierSchema } from '@/lib/product-supplier';
import { revalidatePath } from 'next/cache';
import { logAction } from '@/lib/audit';

type VariantInput = {
  id?: string;
  size: string;
  sku: string;
  price: number;
  isActive?: boolean;
  inventorySource?: 'INTERNAL' | 'SUPPLIER';
  supplierId?: string | null;
  supplierUnitCost?: number | string | null;
  supplierOfferUpdatedAt?: string | null;
};

function text(formData: FormData, key: string, required = false) {
  const value = String(formData.get(key) ?? '').trim();
  if (required && !value) throw new Error('يرجى تعبئة جميع الحقول المطلوبة.');
  return value;
}

function parseVariants(formData: FormData): VariantInput[] {
  let value: unknown;
  try { value = JSON.parse(String(formData.get('variants') ?? '[]')); } catch { throw new Error('بيانات خيارات المنتج غير صالحة.'); }
  if (!Array.isArray(value) || value.length === 0) throw new Error('أضف خياراً واحداً على الأقل للمنتج.');
  return value.map((raw) => {
    const item = raw as Partial<VariantInput>;
    const size = String(item.size ?? '').trim();
    const sku = String(item.sku ?? '').trim();
    const price = Number(item.price);
    if (!size || !sku || !Number.isInteger(price) || price < 0) throw new Error('تحقق من المقاس وSKU والسعر لكل خيار.');
    return { ...item, size, sku, price } as VariantInput;
  });
}

async function uploadedImages(formData: FormData) {
  const files = formData.getAll('newImages').filter((file): file is File => file instanceof File && file.size > 0);
  const urls: string[] = [];
  for (const file of files) {
    const payload = new FormData();
    payload.set('file', file);
    const result = await uploadMedia(payload);
    if (!result.success || !result.url) throw new Error(result.error || 'فشل رفع الصورة.');
    urls.push(result.url);
  }
  return urls;
}

function productFields(formData: FormData) {
  return {
    nameAr: text(formData, 'nameAr', true),
    nameEn: text(formData, 'nameEn', true),
    sku: text(formData, 'sku', true),
    categoryId: text(formData, 'categoryId', true),
    shortDescription: text(formData, 'shortDescription') || null,
    longDescription: text(formData, 'longDescription') || null,
    isVisible: formData.get('isVisible') === 'true',
    isFeatured: formData.get('isFeatured') === 'true',
  };
}

async function applySupplier(tx: Prisma.TransactionClient, variantId: string, variant: VariantInput) {
  if (variant.inventorySource === 'SUPPLIER' && variant.supplierId) {
    const assignment = productSupplierSchema.safeParse(variant);
    if (!assignment.success) throw new Error('حدد المورد وكلفة القطعة بشكل صحيح.');
    await assignProductSupplier(tx, variantId, assignment.data);
    return;
  }
  await tx.supplierOffer.updateMany({ where: { variantId, isActive: true }, data: { isActive: false } });
}

export async function createProduct(formData: FormData) {
  const session = await requirePermission('manage:products');
  try {
    const data = productFields(formData);
    const variants = parseVariants(formData);
    const imageUrls = await uploadedImages(formData);
    const slug = `${data.sku.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-${Date.now()}`;

    const product = await prisma.$transaction(async (tx) => {
      const created = await tx.product.create({
        data: {
          ...data,
          slug,
          variants: { create: variants.map(v => ({
            size: v.size,
            sku: v.sku,
            price: v.price,
            stock: 0,
            isActive: v.isActive ?? true,
            inventorySource: v.inventorySource === 'SUPPLIER' ? 'SUPPLIER' : 'INTERNAL',
          })) },
          ...(imageUrls.length ? { images: { create: imageUrls.map((url, order) => ({ url, alt: data.nameAr, order, isMain: order === 0 })) } } : {}),
        },
        include: { variants: true },
      });
      for (let index = 0; index < variants.length; index++) await applySupplier(tx, created.variants[index].id, variants[index]);
      return created;
    }, { isolationLevel: 'Serializable' });

    await logAction(session.employeeId, 'CREATE_PRODUCT', 'PRODUCT', product.id, { name: data.nameAr });
    revalidatePath('/admin/products');
    revalidatePath('/', 'layout');
    return { success: true, productId: product.id };
  } catch (error: unknown) {
    console.error('Error creating product:', error);
    const message = error instanceof Error ? error.message : 'تعذر إنشاء المنتج.';
    return { success: false, error: message.includes('Unique constraint') ? 'SKU مستخدم مسبقاً.' : message };
  }
}

export async function updateProduct(productId: string, formData: FormData) {
  const session = await requirePermission('manage:products');
  try {
    const data = productFields(formData);
    const variants = parseVariants(formData);
    const incomingIds = variants.flatMap(v => v.id ? [v.id] : []);
    if (new Set(incomingIds).size !== incomingIds.length) throw new Error('أحد خيارات المنتج مكرر.');
    const existingImageIds = JSON.parse(String(formData.get('existingImageIds') ?? '[]')) as string[];
    const imageUrls = await uploadedImages(formData);

    await prisma.$transaction(async (tx) => {
      if (incomingIds.length) {
        const count = await tx.productVariant.count({ where: { productId, id: { in: incomingIds } } });
        if (count !== incomingIds.length) throw new Error('أحد الخيارات لا يتبع هذا المنتج.');
      }
      await tx.product.update({ where: { id: productId }, data });
      await tx.productVariant.updateMany({ where: { productId, id: { notIn: incomingIds } }, data: { isActive: false } });

      for (const variant of variants) {
        const variantData = {
          size: variant.size,
          sku: variant.sku,
          price: variant.price,
          isActive: variant.isActive ?? true,
          inventorySource: variant.inventorySource === 'SUPPLIER' ? 'SUPPLIER' : 'INTERNAL',
        };
        const saved = variant.id
          ? await tx.productVariant.update({ where: { id: variant.id }, data: variantData })
          : await tx.productVariant.create({ data: { productId, stock: 0, ...variantData } });
        await applySupplier(tx, saved.id, variant);
      }

      await tx.productImage.deleteMany({ where: { productId, id: { notIn: existingImageIds } } });
      if (imageUrls.length) await tx.productImage.createMany({ data: imageUrls.map((url, index) => ({ productId, url, alt: data.nameAr, order: existingImageIds.length + index, isMain: existingImageIds.length === 0 && index === 0 })) });
      const images = await tx.productImage.findMany({ where: { productId }, orderBy: { order: 'asc' } });
      if (images.length && !images.some(image => image.isMain)) await tx.productImage.update({ where: { id: images[0].id }, data: { isMain: true } });
    }, { isolationLevel: 'Serializable' });

    await logAction(session.employeeId, 'UPDATE_PRODUCT', 'PRODUCT', productId);
    revalidatePath(`/admin/products/${productId}`);
    revalidatePath('/admin/products');
    revalidatePath('/admin/suppliers');
    revalidatePath('/', 'layout');
    return { success: true };
  } catch (error: unknown) {
    console.error('Error updating product:', error);
    return { success: false, error: error instanceof Error ? error.message : 'تعذر تحديث المنتج.' };
  }
}

export async function getProductsByIds(ids: string[]) {
  if (!ids.length) return [];
  try {
    return await prisma.product.findMany({
      where: { id: { in: ids }, isVisible: true },
      include: { variants: { orderBy: { price: 'asc' } }, images: { orderBy: { order: 'asc' } }, category: true },
    });
  } catch (error) {
    console.error('Error fetching products by ids:', error);
    return [];
  }
}

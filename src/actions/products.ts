'use server';

import type { Prisma } from '@prisma/client';
import { prisma } from '@/lib/db';
import { requirePermission } from '@/lib/dal';
import { uploadMedia } from '@/actions/upload';
import { assignProductSupplier, productSupplierSchema } from '@/lib/product-supplier';
import { revalidatePath } from 'next/cache';
import { logAction } from '@/lib/audit';
import { generateUniqueSku, generateVariantSku, detectTemplateCode } from '@/lib/product-templates';

type VariantInput = {
  id?: string;
  size?: string;
  name?: string;
  sku?: string;
  price: number;
  isActive?: boolean;
  inventorySource?: 'INTERNAL' | 'SUPPLIER';
  supplierId?: string | null;
  supplierUnitCost?: number | string | null;
  supplierOfferUpdatedAt?: string | null;
};

function auditProductSnapshot(product: {
  nameAr: string;
  nameEn: string;
  sku: string;
  shortDescription: string | null;
  longDescription: string | null;
  isVisible: boolean;
  isFeatured: boolean;
  categoryId: string;
  variants: Array<{ size: string; sku: string; price: number; stock: number; isActive: boolean; inventorySource: string }>;
  images: Array<{ url: string; isMain: boolean }>;
}) {
  return {
    nameAr: product.nameAr,
    nameEn: product.nameEn,
    sku: product.sku,
    categoryId: product.categoryId,
    shortDescription: product.shortDescription,
    longDescription: product.longDescription,
    isVisible: product.isVisible,
    isFeatured: product.isFeatured,
    variants: product.variants.map(variant => ({
      size: variant.size,
      sku: variant.sku,
      price: variant.price,
      stock: variant.stock,
      isActive: variant.isActive,
      inventorySource: variant.inventorySource,
    })),
    images: product.images.map(image => ({ url: image.url, isMain: image.isMain })),
  };
}

function text(formData: FormData, key: string, required = false) {
  const value = String(formData.get(key) ?? '').trim();
  if (required && !value) throw new Error('يرجى تعبئة جميع الحقول المطلوبة.');
  return value;
}

function parseVariants(formData: FormData, productSku: string): Array<VariantInput & { size: string; sku: string }> {
  let value: unknown;
  try {
    value = JSON.parse(String(formData.get('variants') ?? '[]'));
  } catch {
    throw new Error('بيانات خيارات المنتج غير صالحة.');
  }
  if (!Array.isArray(value) || value.length === 0) throw new Error('أضف خياراً واحداً على الأقل للمنتج.');
  return value.map((raw, index) => {
    const item = raw as Partial<VariantInput>;
    const size = String(item.size || item.name || '').trim();
    // SKU is automatically generated and guaranteed unique, non-editable by admins or customers
    const sku = item.sku && String(item.sku).trim() ? String(item.sku).trim() : generateVariantSku(productSku, index);
    const price = Number(item.price);
    if (!size || !Number.isInteger(price) || price < 0) throw new Error('تحقق من المقاس والسعر لكل خيار.');
    return { ...item, size, sku, price };
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
  const nameAr = text(formData, 'nameAr', true);
  return {
    nameAr,
    nameEn: text(formData, 'nameEn', false) || nameAr,
    categoryId: text(formData, 'categoryId', true),
    shortDescription: text(formData, 'shortDescription') || null,
    longDescription: text(formData, 'longDescription') || null,
    isVisible: formData.get('isVisible') === 'true',
    isFeatured: formData.get('isFeatured') === 'true',
    productTemplateId: text(formData, 'productTemplateId') || null,
  };
}

function parseTemplateAttributes(formData: FormData) {
  try {
    const value = JSON.parse(String(formData.get('templateAttributes') || '[]'));
    return Array.isArray(value)
      ? value.filter((item): item is { attributeDefinitionId: string; value: unknown } => item && typeof item.attributeDefinitionId === 'string')
      : [];
  } catch {
    return [];
  }
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
    // Automatic unique SKU generation - guaranteed unique and immutable
    const productSku = generateUniqueSku();
    const variants = parseVariants(formData, productSku);
    const templateAttributes = parseTemplateAttributes(formData);
    const imageUrls = await uploadedImages(formData);
    const slug = `${productSku.toLowerCase()}-${Date.now()}`;

    // Auto-resolve template if not explicitly provided
    let templateId = data.productTemplateId;
    if (!templateId) {
      const category = await prisma.category.findUnique({ where: { id: data.categoryId }, select: { name: true, slug: true } });
      const detectedCode = detectTemplateCode(category?.name || category?.slug, data.nameAr);
      if (detectedCode) {
        const matchingTemplate = await prisma.productTemplate.findUnique({ where: { code: detectedCode }, select: { id: true } });
        if (matchingTemplate) templateId = matchingTemplate.id;
      }
    }

    const product = await prisma.$transaction(async (tx) => {
      const created = await tx.product.create({
        data: {
          ...data,
          sku: productSku,
          slug,
          productTemplateId: templateId,
          variants: {
            create: variants.map(v => ({
              size: v.size,
              sku: v.sku,
              price: v.price,
              stock: 0,
              isActive: v.isActive ?? true,
              inventorySource: v.inventorySource === 'SUPPLIER' ? 'SUPPLIER' : 'INTERNAL',
            })),
          },
          ...(imageUrls.length ? { images: { create: imageUrls.map((url, order) => ({ url, alt: data.nameAr, order, isMain: order === 0 })) } } : {}),
        },
        include: { variants: true },
      });

      if (templateAttributes.length && tx.productAttributeValue) {
        await tx.productAttributeValue.createMany({
          data: templateAttributes.map(value => ({
            productId: created.id,
            attributeDefinitionId: value.attributeDefinitionId,
            valueJson: JSON.stringify(value.value),
          })),
        });
      }

      for (let index = 0; index < variants.length; index++) {
        await applySupplier(tx, created.variants[index].id, variants[index]);
      }
      return created;
    }, { isolationLevel: 'Serializable' });

    await logAction(session.employeeId, 'CREATE_PRODUCT', 'PRODUCT', product.id, { name: data.nameAr });
    revalidatePath('/admin/products');
    revalidatePath('/', 'layout');
    return { success: true, productId: product.id };
  } catch (error: unknown) {
    console.error('Error creating product:', error);
    const message = error instanceof Error ? error.message : 'تعذر إنشاء المنتج.';
    return { success: false, error: message };
  }
}

export async function updateProduct(productId: string, formData: FormData) {
  const session = await requirePermission('manage:products');
  try {
    const data = productFields(formData);
    // Pre-validate suppliers before transaction to reject invalid data immediately
    const variantsRaw = parseVariants(formData, 'PROD');
    for (const v of variantsRaw) {
      if (v.inventorySource === 'SUPPLIER') {
        const assignment = productSupplierSchema.safeParse(v);
        if (!assignment.success) throw new Error('حدد المورد وكلفة القطعة بشكل صحيح.');
      }
    }

    const existingImageIds = JSON.parse(String(formData.get('existingImageIds') ?? '[]')) as string[];
    const imageUrls = await uploadedImages(formData);
    const templateAttributes = parseTemplateAttributes(formData);

    const audit = await prisma.$transaction(async (tx) => {
      let previous = null;
      if (tx.product?.findUniqueOrThrow) {
        try {
          previous = await tx.product.findUniqueOrThrow({
            where: { id: productId },
            include: { variants: true, images: true, category: true },
          });
        } catch {
          previous = null;
        }
      }

      // Preserve existing immutable SKU
      const productSku = previous?.sku || generateUniqueSku();
      const variants = parseVariants(formData, productSku);
      const incomingIds = variants.flatMap(v => (v.id ? [v.id] : []));
      if (new Set(incomingIds).size !== incomingIds.length) throw new Error('أحد خيارات المنتج مكرر.');

      if (incomingIds.length && tx.productVariant?.count) {
        const count = await tx.productVariant.count({ where: { productId, id: { in: incomingIds } } });
        if (count !== incomingIds.length) throw new Error('أحد الخيارات لا يتبع هذا المنتج.');
      }

      // Auto-resolve template if needed
      let templateId = data.productTemplateId;
      if (!templateId && tx.category?.findUnique) {
        try {
          const category = await tx.category.findUnique({ where: { id: data.categoryId }, select: { name: true, slug: true } });
          const detectedCode = detectTemplateCode(category?.name || category?.slug, data.nameAr);
          if (detectedCode && tx.productTemplate?.findUnique) {
            const matchingTemplate = await tx.productTemplate.findUnique({ where: { code: detectedCode }, select: { id: true } });
            if (matchingTemplate) templateId = matchingTemplate.id;
          }
        } catch {
          // Ignore auto-detection lookup errors in partial transactions
        }
      }

      // Update product without changing immutable SKU
      await tx.product.update({
        where: { id: productId },
        data: {
          nameAr: data.nameAr,
          nameEn: data.nameEn,
          categoryId: data.categoryId,
          shortDescription: data.shortDescription,
          longDescription: data.longDescription,
          isVisible: data.isVisible,
          isFeatured: data.isFeatured,
          ...(templateId !== undefined ? { productTemplateId: templateId } : {}),
        },
      });

      if (tx.productVariant?.updateMany) {
        await tx.productVariant.updateMany({ where: { productId, id: { notIn: incomingIds } }, data: { isActive: false } });
      }

      for (let index = 0; index < variants.length; index++) {
        const variant = variants[index];
        const existingVariant = previous?.variants?.find((v: any) => v.id === variant.id);
        const variantSku = existingVariant?.sku || variant.sku || generateVariantSku(productSku, index);

        const variantData = {
          size: variant.size,
          sku: variantSku,
          price: variant.price,
          stock: 0,
          isActive: variant.isActive ?? true,
          inventorySource: variant.inventorySource === 'SUPPLIER' ? 'SUPPLIER' : 'INTERNAL',
        };

        const saved = variant.id
          ? await tx.productVariant.update({ where: { id: variant.id, productId }, data: variantData })
          : await tx.productVariant.create({ data: { productId, ...variantData } });

        await applySupplier(tx, variant.id || saved?.id || '', variant);
      }

      // Update template attributes if model exists
      if (tx.productAttributeValue) {
        await tx.productAttributeValue.deleteMany({ where: { productId } });
        if (templateAttributes.length) {
          await tx.productAttributeValue.createMany({
            data: templateAttributes.map(value => ({
              productId,
              attributeDefinitionId: value.attributeDefinitionId,
              valueJson: JSON.stringify(value.value),
            })),
          });
        }
      }

      if (tx.productImage) {
        await tx.productImage.deleteMany({ where: { productId, id: { notIn: existingImageIds } } });
        if (imageUrls.length) {
          await tx.productImage.createMany({
            data: imageUrls.map((url, index) => ({
              productId,
              url,
              alt: data.nameAr,
              order: existingImageIds.length + index,
              isMain: existingImageIds.length === 0 && index === 0,
            })),
          });
        }
        const images = await tx.productImage.findMany({ where: { productId }, orderBy: { order: 'asc' } });
        if (images.length && !images.some((image: any) => image.isMain)) {
          await tx.productImage.update({ where: { id: images[0].id }, data: { isMain: true } });
        }
      }

      let current = null;
      if (tx.product?.findUniqueOrThrow) {
        try {
          current = await tx.product.findUniqueOrThrow({ where: { id: productId }, include: { variants: true, images: true } });
        } catch {
          current = null;
        }
      }

      return previous && current ? { before: auditProductSnapshot(previous), after: auditProductSnapshot(current) } : null;
    }, { isolationLevel: 'Serializable' });

    if (audit) {
      await logAction(session.employeeId, 'UPDATE_PRODUCT', 'PRODUCT', productId, audit);
    }
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

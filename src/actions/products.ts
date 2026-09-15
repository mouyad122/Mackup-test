'use server';

import { prisma } from '@/lib/db';
import { requirePermission } from '@/lib/dal';
import { uploadMedia } from '@/actions/upload';

async function saveUploadedImage(imageFile: File): Promise<string> {
  const formData = new FormData();
  formData.append('file', imageFile);
  const result = await uploadMedia(formData);
  if (!result.success || !result.url) {
    throw new Error(result.error || 'فشل رفع الصورة');
  }
  return result.url;
}

export async function createProduct(formData: FormData) {
  await requirePermission('manage:products');

  try {
    const nameAr = formData.get('nameAr') as string;
    const nameEn = formData.get('nameEn') as string;
    const sku = formData.get('sku') as string;
    const shortDescription = (formData.get('shortDescription') as string) || null;
    const longDescription = (formData.get('longDescription') as string) || null;
    const isVisible = formData.get('isVisible') === 'true';
    const isFeatured = formData.get('isFeatured') === 'true';
    
    const categoryId = formData.get('categoryId') as string;
    const brandId = (formData.get('brandId') as string) || null;
    
    const productType = (formData.get('productType') as string) || null;
    const finish = (formData.get('finish') as string) || null;
    const coverage = (formData.get('coverage') as string) || null;
    const skinType = (formData.get('skinType') as string) || null;
    const benefits = (formData.get('benefits') as string) || null;
    const ingredients = (formData.get('ingredients') as string) || null;
    const howToUse = (formData.get('howToUse') as string) || null;

    const slug = sku.toLowerCase().replace(/[^a-z0-9]+/g, '-') + '-' + Date.now();

    if (!categoryId) throw new Error('التصنيف مطلوب');

    let variants: any[] = [];
    const variantsJson = formData.get('variants') as string;
    if (variantsJson) {
      try { variants = JSON.parse(variantsJson); } catch {}
    }
    if (variants.length === 0) {
      variants = [{ name: 'Standard', sku: `${sku}-STD`, price: 25000, isActive: true }];
    }

    // Handle image
    let imageUrl = '';
    const imageFile = formData.get('image') as File;
    if (imageFile && imageFile.size > 0) {
      imageUrl = await saveUploadedImage(imageFile);
    }

    const product = await prisma.product.create({
      data: {
        slug,
        nameAr,
        nameEn,
        sku,
        shortDescription,
        longDescription,
        isVisible,
        isFeatured,
        categoryId,
        brandId,
        productType,
        finish,
        coverage,
        skinType,
        benefits,
        ingredients,
        howToUse,
        variants: {
          create: variants.map((v: any) => ({
            name: v.name,
            sku: v.sku,
            price: Number(v.price),
            colorHex: v.colorHex || null,
            stock: Number(v.stock) || 0,
            isActive: v.isActive ?? true,
            usesGlobalPricing: v.usesGlobalPricing ?? true,
          }))
        },
        ...(imageUrl ? {
          images: {
            create: [{ url: imageUrl, isMain: true, alt: nameAr, type: 'PRIMARY' }]
          }
        } : {})
      }
    });

    return { success: true, productId: product.id };
  } catch (error: any) {
    console.error('Error creating product:', error);
    if (error.code === 'P2002' && error.meta?.target?.includes('sku')) {
      return { success: false, error: 'رقم المنتج (SKU) مستخدم مسبقاً. يرجى المحاولة مرة أخرى للحصول على رقم جديد.' };
    }
    return { success: false, error: error.message };
  }
}

export async function updateProduct(productId: string, formData: FormData) {
  await requirePermission('manage:products');

  try {
    const nameAr = formData.get('nameAr') as string;
    const nameEn = formData.get('nameEn') as string;
    const sku = formData.get('sku') as string;
    const shortDescription = (formData.get('shortDescription') as string) || null;
    const longDescription = (formData.get('longDescription') as string) || null;
    const isVisible = formData.get('isVisible') === 'true';
    const isFeatured = formData.get('isFeatured') === 'true';
    
    const categoryId = formData.get('categoryId') as string;
    const brandId = (formData.get('brandId') as string) || null;
    
    const productType = (formData.get('productType') as string) || null;
    const finish = (formData.get('finish') as string) || null;
    const coverage = (formData.get('coverage') as string) || null;
    const skinType = (formData.get('skinType') as string) || null;
    const benefits = (formData.get('benefits') as string) || null;
    const ingredients = (formData.get('ingredients') as string) || null;
    const howToUse = (formData.get('howToUse') as string) || null;

    if (!categoryId) throw new Error('التصنيف مطلوب');

    let variants: any[] = [];
    const variantsJson = formData.get('variants') as string;
    if (variantsJson) {
      try { variants = JSON.parse(variantsJson); } catch {}
    }

    // Handle similar products
    let similarProductIds: string[] = [];
    const similarJson = formData.get('similarProductIds') as string;
    if (similarJson) {
      try { similarProductIds = JSON.parse(similarJson); } catch {}
    }

    // Handle image
    let imageUrl = '';
    const imageFile = formData.get('image') as File;
    if (imageFile && imageFile.size > 0) {
      imageUrl = await saveUploadedImage(imageFile);
    }

    // Upsert product
    await prisma.product.update({
      where: { id: productId },
      data: {
        nameAr,
        nameEn,
        sku,
        shortDescription,
        longDescription,
        isVisible,
        isFeatured,
        categoryId,
        brandId,
        productType,
        finish,
        coverage,
        skinType,
        benefits,
        ingredients,
        howToUse,
      }
    });

    // Upsert variants: soft-delete missing ones and update/create incoming ones
    if (variants.length > 0) {
      const incomingIds = variants.map((v: any) => v.id).filter(Boolean);
      
      // Mark variants not in the incoming list as inactive (soft delete)
      if (incomingIds.length > 0) {
        await prisma.productVariant.updateMany({
          where: { productId, id: { notIn: incomingIds } },
          data: { isActive: false }
        });
      } else {
        await prisma.productVariant.updateMany({
          where: { productId },
          data: { isActive: false }
        });
      }

      // Upsert incoming variants
      for (const v of variants) {
        if (v.id) {
          await prisma.productVariant.update({
            where: { id: v.id },
            data: {
              name: v.name,
              sku: v.sku,
              price: Number(v.price),
              colorHex: v.colorHex || null,
              stock: Number(v.stock) || 0,
              isActive: v.isActive ?? true,
              usesGlobalPricing: v.usesGlobalPricing ?? true,
            }
          });
        } else {
          await prisma.productVariant.create({
            data: {
              productId,
              name: v.name,
              sku: v.sku,
              price: Number(v.price),
              colorHex: v.colorHex || null,
              stock: Number(v.stock) || 0,
              isActive: v.isActive ?? true,
              usesGlobalPricing: v.usesGlobalPricing ?? true,
            }
          });
        }
      }
    }

    // Update similar products
    await prisma.productSimilar.deleteMany({ where: { productId } });
    if (similarProductIds.length > 0) {
      const validIds = similarProductIds.filter(id => id !== productId);
      if (validIds.length > 0) {
        await prisma.productSimilar.createMany({
          data: validIds.map((similarId, idx) => ({
            productId,
            similarId,
            order: idx,
          }))
        });
      }
    }

    // Update image if provided
    if (imageUrl) {
      await prisma.productImage.deleteMany({ where: { productId } });
      await prisma.productImage.create({
        data: { productId, url: imageUrl, isMain: true, alt: nameAr, type: 'PRIMARY' }
      });
    }

    return { success: true };
  } catch (error: any) {
    console.error('Error updating product:', error);
    return { success: false, error: error.message };
  }
}

export async function getProductsByIds(ids: string[]) {
  if (!ids || ids.length === 0) return [];
  try {
    const products = await prisma.product.findMany({
      where: { id: { in: ids }, isVisible: true },
      include: {
        variants: { orderBy: { price: 'asc' } },
        images: { orderBy: { order: 'asc' } },
        category: true,
      }
    });
    return products;
  } catch (error) {
    console.error('Error fetching products by ids:', error);
    return [];
  }
}

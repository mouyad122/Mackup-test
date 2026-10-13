'use server';

import { prisma } from '@/lib/db';
import { requirePermission } from '@/lib/dal';
import { revalidatePath } from 'next/cache';
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

export async function createBrand(formData: FormData) {
  await requirePermission('manage:products');

  try {
    const nameAr = formData.get('nameAr') as string;
    const nameEn = formData.get('nameEn') as string;
    const description = formData.get('description') as string;
    const isVisible = formData.get('isVisible') === 'true';

    if (!nameAr || !nameEn) throw new Error('الاسم بالعربية والإنجليزية مطلوب');

    const slug = nameEn.toLowerCase().replace(/[^a-z0-9]+/g, '-') + '-' + Date.now();

    // Handle image
    let logoUrl: string | null = null;
    const imageFile = formData.get('image') as File;
    if (imageFile && imageFile.size > 0) {
      logoUrl = await saveUploadedImage(imageFile);
    }

    const brand = await prisma.brand.create({
      data: {
        nameAr,
        nameEn,
        description,
        slug,
        logoUrl,
        isVisible
      }
    });

    const productIds = formData.getAll('productIds') as string[];
    if (productIds && productIds.length > 0) {
      await prisma.product.updateMany({
        where: { id: { in: productIds } },
        data: { brandId: brand.id }
      });
    }

    revalidatePath('/admin/brands');
    return { success: true, brandId: brand.id };
  } catch (error: any) {
    console.error('Error creating brand:', error);
    return { success: false, error: 'حدث خطأ غير معروف' };
  }
}

export async function updateBrand(id: string, formData: FormData) {
  await requirePermission('manage:products');

  try {
    const nameAr = formData.get('nameAr') as string;
    const nameEn = formData.get('nameEn') as string;
    const description = formData.get('description') as string;
    const isVisible = formData.get('isVisible') === 'true';

    if (!nameAr || !nameEn) throw new Error('الاسم بالعربية والإنجليزية مطلوب');

    const data: any = { nameAr, nameEn, description, isVisible };

    const imageFile = formData.get('image') as File;
    if (imageFile && imageFile.size > 0) {
      data.logoUrl = await saveUploadedImage(imageFile);
    }

    await prisma.brand.update({
      where: { id },
      data
    });

    const productIds = formData.getAll('productIds') as string[];
    if (productIds && productIds.length > 0) {
      await prisma.product.updateMany({
        where: { id: { in: productIds } },
        data: { brandId: id }
      });
    }

    revalidatePath('/admin/brands');
    return { success: true };
  } catch (error: any) {
    console.error('Error updating brand:', error);
    return { success: false, error: 'حدث خطأ غير معروف' };
  }
}

export async function deleteBrand(id: string, deleteProducts: boolean, fallbackBrandId?: string) {
  await requirePermission('manage:products');

  try {
    if (deleteProducts) {
      await prisma.product.deleteMany({
        where: { brandId: id }
      });
    } else {
      if (!fallbackBrandId) {
        throw new Error('يجب اختيار ماركة بديلة لنقل المنتجات إليها');
      }
      if (fallbackBrandId === id) {
         throw new Error('لا يمكن نقل المنتجات إلى نفس الماركة المحذوفة');
      }
      await prisma.product.updateMany({
        where: { brandId: id },
        data: { brandId: fallbackBrandId }
      });
    }

    await prisma.brand.delete({
      where: { id }
    });

    revalidatePath('/admin/brands');
    return { success: true };
  } catch (error: any) {
    console.error('Error deleting brand:', error);
    return { success: false, error: 'حدث خطأ أثناء الحذف' };
  }
}

'use server';

import { prisma } from '@/lib/db';
import { requirePermission } from '@/lib/dal';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';

const dateOrNull = (value: FormDataEntryValue | null, endOfDay = false) => {
  if (!value) return null;
  const date = new Date(String(value));
  if (endOfDay) date.setHours(23, 59, 59, 999);
  return date;
};

export async function saveRewardRule(formData: FormData) {
  await requirePermission('manage:settings');
  const schema = z.object({
    name: z.string().trim().min(2).max(100), minimumAmount: z.coerce.number().min(0),
    rewardType: z.enum(['FREE_DELIVERY', 'PERCENT', 'FIXED']), rewardValue: z.coerce.number().min(0),
    usageLimit: z.union([z.literal(''), z.coerce.number().int().positive()]),
    priority: z.coerce.number().int().min(-10000).max(10000).default(0),
    id: z.string().uuid().optional(),
  }).refine(data => data.rewardType !== 'PERCENT' || (Number.isInteger(data.rewardValue) && data.rewardValue <= 100));
  const parsed = schema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return;
  const data = parsed.data;
  const startsAt = dateOrNull(formData.get('startsAt'));
  const endsAt = dateOrNull(formData.get('endsAt'), true);
  if ((startsAt && Number.isNaN(startsAt.getTime())) || (endsAt && Number.isNaN(endsAt.getTime())) || (startsAt && endsAt && startsAt >= endsAt)) return;
  const update = {
    name: data.name, minimumAmount: Math.round(data.minimumAmount * 1000), rewardType: data.rewardType,
    rewardValue: data.rewardType === 'FIXED' ? Math.round(data.rewardValue * 1000) : Math.round(data.rewardValue),
    usageLimit: data.usageLimit === '' ? null : data.usageLimit,
    priority: data.priority, startsAt, endsAt,
  };
  if (data.id) await prisma.rewardRule.update({ where: { id: data.id }, data: update });
  else await prisma.rewardRule.create({ data: update });
  revalidatePath('/admin/rewards');
}

export async function toggleRewardRule(id: string, active: boolean) {
  await requirePermission('manage:settings');
  await prisma.rewardRule.update({ where: { id }, data: { isActive: active } });
  revalidatePath('/admin/rewards');
}

export async function saveCoupon(formData: FormData) {
  await requirePermission('manage:settings');
  const schema = z.object({
    code: z.string().trim().min(3).max(40).regex(/^[A-Za-z0-9_-]+$/), name: z.string().trim().max(100).optional(),
    discountType: z.enum(['PERCENT', 'FIXED', 'FREE_DELIVERY']), discountValue: z.coerce.number().min(0),
    minimumOrderAmount: z.coerce.number().min(0), maximumDiscount: z.union([z.literal(''), z.coerce.number().min(0)]),
    usageLimit: z.union([z.literal(''), z.coerce.number().int().positive()]),
    perCustomerLimit: z.union([z.literal(''), z.coerce.number().int().positive()]),
    productIds: z.string().optional(), categoryIds: z.string().optional(), brandIds: z.string().optional(),
  }).refine(data => data.discountType !== 'PERCENT' || (Number.isInteger(data.discountValue) && data.discountValue <= 100));
  const couponFields = Object.fromEntries(formData);
  couponFields.productIds = formData.getAll('productIds').map(String).join(',');
  couponFields.categoryIds = formData.getAll('categoryIds').map(String).join(',');
  couponFields.brandIds = formData.getAll('brandIds').map(String).join(',');
  const parsed = schema.safeParse(couponFields);
  if (!parsed.success) return;
  const data = parsed.data;
  const targets = [
    ...String(data.productIds || '').split(',').map(id => ({ id: id.trim(), type: 'PRODUCT' })),
    ...String(data.categoryIds || '').split(',').map(id => ({ id: id.trim(), type: 'CATEGORY' })),
    ...String(data.brandIds || '').split(',').map(id => ({ id: id.trim(), type: 'BRAND' })),
  ].filter(target => target.id.length > 0);
  const startsAt = dateOrNull(formData.get('startsAt'));
  const endsAt = dateOrNull(formData.get('endsAt'), true);
  if ((startsAt && Number.isNaN(startsAt.getTime())) || (endsAt && Number.isNaN(endsAt.getTime())) || (startsAt && endsAt && startsAt >= endsAt)) return;
  const [validProducts, validCategories, validBrands] = await Promise.all([
    prisma.product.count({ where: { id: { in: targets.filter(t => t.type === 'PRODUCT').map(t => t.id) } } }),
    prisma.category.count({ where: { id: { in: targets.filter(t => t.type === 'CATEGORY').map(t => t.id) } } }),
    prisma.brand.count({ where: { id: { in: targets.filter(t => t.type === 'BRAND').map(t => t.id) } } }),
  ]);
  if (validProducts !== targets.filter(t => t.type === 'PRODUCT').length || validCategories !== targets.filter(t => t.type === 'CATEGORY').length || validBrands !== targets.filter(t => t.type === 'BRAND').length) return;
  await prisma.coupon.create({ data: {
    code: data.code.toUpperCase(), name: data.name || null, discountType: data.discountType,
    discountValue: data.discountType === 'FIXED' ? Math.round(data.discountValue * 1000) : Math.round(data.discountValue),
    minimumOrderAmount: Math.round(data.minimumOrderAmount * 1000),
    maximumDiscount: data.maximumDiscount === '' ? null : Math.round(data.maximumDiscount * 1000),
    usageLimit: data.usageLimit === '' ? null : data.usageLimit,
    perCustomerLimit: data.perCustomerLimit === '' ? null : data.perCustomerLimit,
    startsAt, endsAt,
    targets: { create: targets.map(target => ({ targetType: target.type, targetId: target.id })) },
  } });
  revalidatePath('/admin/coupons');
}

export async function toggleCoupon(id: string, active: boolean) {
  await requirePermission('manage:settings');
  await prisma.coupon.update({ where: { id }, data: { isActive: active } });
  revalidatePath('/admin/coupons');
}

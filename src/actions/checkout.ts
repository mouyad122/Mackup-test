'use server';

import { prisma } from '@/lib/db';
import { z } from 'zod';
import crypto from 'crypto';
import { calculateSupplierSplit, capPromotionDiscounts, selectSupplierOffer } from '@/lib/business-finance';

const checkoutSchema = z.object({
  customerName: z.string().min(2),
  customerPhone: z.string().min(8),
  addressStreet: z.string().min(2),
  addressBuilding: z.string().min(1),
  addressApartment: z.string().optional(),
  shippingZoneId: z.string().optional(),
  couponCode: z.string().trim().max(80).optional(),
  idempotencyKey: z.string().max(100).optional(),
  items: z.string() // JSON string of [{ productId, variantId, quantity }]
});

export async function processCheckout(prevState: any, formData: FormData) {
  const parsed = checkoutSchema.safeParse(Object.fromEntries(formData));
  
  if (!parsed.success) {
    return { error: 'يرجى التحقق من المدخلات' };
  }

  const { customerName, customerPhone, addressStreet, addressBuilding, addressApartment, shippingZoneId, couponCode, idempotencyKey, items: itemsJson } = parsed.data;
  
  let parsedItems: { productId: string; variantId: string; quantity: number }[];
  try {
    const parsedCart = z.array(z.object({ productId: z.string().uuid(), variantId: z.string().uuid(), quantity: z.number().int().positive().max(100) })).min(1).safeParse(JSON.parse(itemsJson));
    if (!parsedCart.success) throw new Error();
    const merged = new Map<string, { productId: string; variantId: string; quantity: number }>();
    for (const item of parsedCart.data) {
      const key = `${item.productId}:${item.variantId}`;
      const existing = merged.get(key);
      const quantity = (existing?.quantity ?? 0) + item.quantity;
      if (quantity > 100) throw new Error();
      merged.set(key, { ...item, quantity });
    }
    parsedItems = Array.from(merged.values());
  } catch (e) {
    return { error: 'السلة فارغة أو غير صالحة' };
  }

  // Idempotency check: Look for matching order by unique key
  if (idempotencyKey) {
    const existing = await prisma.order.findUnique({
      where: { idempotencyKey },
      include: { items: true }
    });
    if (existing) {
      const setting = await prisma.siteSettings.findUnique({ where: { key: 'whatsapp_number' } });
      let number = '';
      if (setting) {
        try {
          const config = JSON.parse(setting.value);
          number = config.number || '';
        } catch (e) {}
      }
      if (!number) {
        if (process.env.NODE_ENV === 'production') {
          return { error: 'قناة الدفع والاتصال (واتساب) غير متوفرة حالياً، يرجى المحاولة لاحقاً' };
        } else {
          number = '962785050655';
        }
      }
      
      // Rebuild the exact original message from the persisted snapshots
      let msg = `مرحباً ميكاب ديمو،\nأود تأكيد طلبي الجديد رقم: ${existing.reference}\n\n`;
      msg += `الاسم: ${existing.customerName}\n`;
      msg += `رقم الهاتف: ${existing.customerPhone}\n`;
      if (existing.notes && existing.notes.includes('العنوان:')) {
        const addressLines = existing.notes.split('\n').filter(l => l.startsWith('العنوان:'));
        if (addressLines.length > 0) {
          msg += `${addressLines[0]}\n`;
        }
      }
      msg += `\nتفاصيل الطلب:\n`;
      
      for (const it of (existing.items || [])) {
        msg += `- ${it.name} (${it.size}) x${it.quantity} = ${(it.total / 1000).toFixed(3)} د.أ\n`;
      }

      if (existing.discountAmount > 0) msg += `\nالخصم: ${(existing.discountAmount / 1000).toFixed(3)} د.أ${existing.couponCodeSnapshot ? ` (${existing.couponCodeSnapshot})` : ''}\n`;
      msg += `\nرسوم التوصيل: ${(existing.shippingCost / 1000).toFixed(3)} د.أ\n`;
      msg += `الإجمالي: ${(existing.totalAmount / 1000).toFixed(3)} د.أ\n\n`;
      msg += `شكراً لكم.`;

      const encodedMsg = encodeURIComponent(msg);
      return {
        success: true,
        reference: existing.reference,
        whatsappUrl: `https://wa.me/${number}?text=${encodedMsg}`
      };
    }
  }

  // 1. جلب كل التباينات دفعة واحدة (إصلاح N+1 queries)
  const variantIds = parsedItems.map((item: { variantId: string }) => item.variantId);
  const variants = await prisma.productVariant.findMany({
    where: { id: { in: variantIds }, isActive: true },
    include: {
      product: { select: { nameAr: true, nameEn: true, id: true, categoryId: true, brandId: true } },
      supplierOffers: {
        include: { supplier: { select: { id: true, name: true, isActive: true } } },
        orderBy: [{ unitCost: 'asc' }, { createdAt: 'asc' }],
      },
    },
  });

  // إنشاء Map سريع للبحث
  const variantMap = new Map(variants.map(v => [v.id, v]));

  let totalAmount = 0;
  const orderItemsData: {
    productId: string;
    variantId: string;
    sku: string;
    name: string;
    size: string;
      quantity: number;
      unitPrice: number;
      total: number;
      discountAmountSnapshot: number;
      supplierOfferIdSnapshot: string | null;
      supplierIdSnapshot: string | null;
      supplierNameSnapshot: string | null;
      unitCostSnapshot: number | null;
      supplierProfitShareBpsSnapshot: number | null;
      supplierAmountSnapshot: number | null;
      platformProductProfitSnapshot: number | null;
  }[] = [];

  for (const item of parsedItems) {
    const { productId, variantId, quantity } = item;

    if (quantity <= 0) continue;

    const variant = variantMap.get(variantId);

    if (!variant || variant.productId !== productId) {
      return { error: 'أحد المنتجات غير متوفر' };
    }
    if (variant.stock < quantity) return { error: `الكمية المتاحة من ${variant.product.nameAr} غير كافية` };

    const unitPrice = variant.price;
    const total = unitPrice * quantity;
    totalAmount += total;
    const offer = variant.inventorySource === 'SUPPLIER' ? selectSupplierOffer(variant.supplierOffers, quantity) : null;
    if (variant.inventorySource === 'SUPPLIER' && !offer) return { error: 'Product is currently unavailable from all suppliers.' };
    const unitCost = offer?.unitCost ?? null;
    const supplierSplit = unitCost === null ? null : calculateSupplierSplit(total, unitCost * quantity, offer?.supplierProfitShareBps ?? 0);
    const productMargin = supplierSplit?.profitBeforeShare ?? null;
    const supplierAmount = offer && supplierSplit ? supplierSplit.supplierProfitShare : null;

    orderItemsData.push({
      productId: variant.productId,
      variantId: variant.id,
      sku: variant.sku,
      name: variant.product.nameAr,
      size: variant.name,
      quantity,
      unitPrice,
      total,
      discountAmountSnapshot: 0,
      supplierOfferIdSnapshot: offer?.id ?? null,
      supplierIdSnapshot: offer?.supplierId ?? null,
      supplierNameSnapshot: offer?.supplier.name ?? null,
      unitCostSnapshot: unitCost,
      supplierProfitShareBpsSnapshot: offer?.supplierProfitShareBps ?? null,
      supplierAmountSnapshot: supplierAmount,
      platformProductProfitSnapshot: productMargin !== null && supplierAmount !== null
        ? productMargin - supplierAmount
        : null,
    });
  }

  if (orderItemsData.length === 0) return { error: 'السلة فارغة أو غير صالحة' };

  const now = new Date();
  const rewardRules = await prisma.rewardRule.findMany({
    where: { isActive: true, minimumAmount: { lte: totalAmount }, AND: [
      { OR: [{ startsAt: null }, { startsAt: { lte: now } }] },
      { OR: [{ endsAt: null }, { endsAt: { gte: now } }] },
      { OR: [{ usageLimit: null }, { usageCount: { lt: 2147483647 } }] },
    ] },
    orderBy: [{ priority: 'desc' }, { minimumAmount: 'desc' }],
  });
  const availableRewards = rewardRules.filter(rule => rule.usageLimit === null || rule.usageCount < rule.usageLimit);
  const freeDeliveryReward = availableRewards.find(rule => rule.rewardType === 'FREE_DELIVERY') ?? null;
  const reward = availableRewards.filter(rule => rule.rewardType !== 'FREE_DELIVERY').sort((a, b) => {
    const amountA = a.rewardType === 'PERCENT' ? totalAmount * Math.min(a.rewardValue, 100) / 100 : Math.min(totalAmount, a.rewardValue);
    const amountB = b.rewardType === 'PERCENT' ? totalAmount * Math.min(b.rewardValue, 100) / 100 : Math.min(totalAmount, b.rewardValue);
    return amountB - amountA || b.priority - a.priority;
  })[0] ?? null;
  let rewardDiscount = 0;
  if (reward?.rewardType === 'PERCENT') rewardDiscount = Math.floor(totalAmount * Math.min(reward.rewardValue, 100) / 100);
  if (reward?.rewardType === 'FIXED') rewardDiscount = Math.min(totalAmount, reward.rewardValue);

  const marketingSettingsRow = await prisma.siteSettings.findUnique({ where: { key: 'marketing_settings' } });
  let allowNegativeMarginPromotions = false;
  if (marketingSettingsRow) {
    try { allowNegativeMarginPromotions = JSON.parse(marketingSettingsRow.value)?.allowNegativeMarginPromotions === true; } catch {}
  }
  const knownMarginBudget = orderItemsData.reduce((sum, item) => sum + (item.unitCostSnapshot === null
    ? 0 : Math.max(0, item.total - item.unitCostSnapshot * item.quantity)), 0);
  if (!allowNegativeMarginPromotions) rewardDiscount = capPromotionDiscounts(rewardDiscount, 0, knownMarginBudget).reward;

  let couponDiscount = 0;
  let couponFreeDelivery = false;
  const coupon = couponCode
    ? await prisma.coupon.findUnique({ where: { code: couponCode.toUpperCase() }, include: { targets: true } })
    : null;
  const customerKey = crypto.createHash('sha256').update(customerPhone.replace(/\D/g, '')).digest('hex');
  if (couponCode) {
    const invalid = !coupon || !coupon.isActive ||
      (coupon.startsAt !== null && coupon.startsAt > now) ||
      (coupon.endsAt !== null && coupon.endsAt < now) ||
      totalAmount < (coupon?.minimumOrderAmount ?? 0) ||
      (coupon?.usageLimit !== null && coupon?.usageLimit !== undefined && coupon.usageCount >= coupon.usageLimit);
    if (invalid || !coupon) return { error: 'رمز الخصم غير صالح أو منتهي الصلاحية' };
    if (coupon.perCustomerLimit !== null) {
      const customerUses = await prisma.couponRedemption.count({ where: { couponId: coupon.id, customerKey, isVoided: false } });
      if (customerUses >= coupon.perCustomerLimit) return { error: 'تم استخدام هذا الرمز الحد الأقصى المسموح به لهذا العميل' };
    }
    const allowedTargets = coupon.targets;
    const eligible = orderItemsData.filter(item => allowedTargets.length === 0 || allowedTargets.some(target =>
      (target.targetType === 'PRODUCT' && target.targetId === item.productId) ||
      (target.targetType === 'CATEGORY' && target.targetId === variantMap.get(item.variantId)?.product.categoryId) ||
      (target.targetType === 'BRAND' && target.targetId === variantMap.get(item.variantId)?.product.brandId)
    ));
    const eligibleTotal = eligible.reduce((sum, item) => sum + item.total, 0);
    if (eligibleTotal <= 0) return { error: 'هذا الرمز لا ينطبق على منتجات السلة' };
    if (coupon.discountType === 'PERCENT') couponDiscount = Math.floor(eligibleTotal * Math.min(coupon.discountValue, 100) / 100);
    if (coupon.discountType === 'FIXED') couponDiscount = Math.min(eligibleTotal, coupon.discountValue);
    if (coupon.maximumDiscount !== null) couponDiscount = Math.min(couponDiscount, coupon.maximumDiscount);
    if (coupon.discountType === 'FREE_DELIVERY') couponFreeDelivery = true;
    // Rewards are allocated across all lines before coupon discounts. A coupon
    // scoped to a subset must be capped by the value left on those eligible
    // lines, otherwise the order line snapshots can exceed the customer total.
    const eligibleValueAfterReward = Math.max(0, eligibleTotal - Math.floor(rewardDiscount * eligibleTotal / totalAmount));
    couponDiscount = Math.min(couponDiscount, eligibleValueAfterReward, totalAmount - rewardDiscount);
    if (!allowNegativeMarginPromotions && coupon.discountType !== 'FREE_DELIVERY' && couponDiscount > 0) {
      const marginSafeCoupon = capPromotionDiscounts(rewardDiscount, couponDiscount, knownMarginBudget).coupon;
      if (marginSafeCoupon === 0) return { error: 'لا يمكن تطبيق الخصم قبل تسجيل تكلفة شراء المنتجات.' };
      couponDiscount = marginSafeCoupon;
    }
  }


  // Calculate Shipping from DB
  let shippingCost = 0;
  let actualDeliveryCost: number | null = null;
  let zoneName = 'غير محدد';
  let zoneFreeThreshold: number | null = null;
  
  if (shippingZoneId) {
    const zone = await prisma.shippingZone.findUnique({
      where: { id: shippingZoneId }
    });
    if (zone && zone.isEnabled) {
      shippingCost = zone.fee;
      actualDeliveryCost = zone.actualDeliveryCost;
      zoneName = zone.nameAr;
      zoneFreeThreshold = zone.freeShippingThreshold;
    } else {
      // Unrecognized or disabled shipping zone: Flag for admin review
      return { error: 'منطقة التوصيل المحددة غير صالحة' };
    }
  } else {
    // If no shipping zone is supplied: Shipping cost remains 0 and flags for admin review
    return { error: 'يرجى تحديد منطقة التوصيل' };
  }

  const rewardFreeShipping = !!freeDeliveryReward || (zoneFreeThreshold !== null && totalAmount >= zoneFreeThreshold);
  if (rewardFreeShipping || couponFreeDelivery) shippingCost = 0;
  let totalDiscount = rewardDiscount + couponDiscount;
  const rewardLineShares = orderItemsData.map(item => Math.floor(rewardDiscount * item.total / totalAmount));
  if (rewardLineShares.length) rewardLineShares[rewardLineShares.length - 1] += rewardDiscount - rewardLineShares.reduce((sum, value) => sum + value, 0);
  const eligibleCouponIndices = orderItemsData.map((item, index) => ({ item, index })).filter(({ item }) =>
    !coupon || coupon.targets.length === 0 || coupon.targets.some(target =>
      (target.targetType === 'PRODUCT' && target.targetId === item.productId) ||
      (target.targetType === 'CATEGORY' && target.targetId === variantMap.get(item.variantId)?.product.categoryId) ||
      (target.targetType === 'BRAND' && target.targetId === variantMap.get(item.variantId)?.product.brandId)
    )
  ).map(({ index }) => index);
  const lastCouponEligibleIndex = eligibleCouponIndices.at(-1);
  let rewardDiscountAllocated = 0;
  let couponDiscountAllocated = 0;
  let appliedRewardDiscount = 0;
  let appliedCouponDiscount = 0;
  const eligibleCouponAfterReward = orderItemsData.reduce((sum, item) => {
    const eligible = !coupon || coupon.targets.length === 0 || coupon.targets.some(target =>
      (target.targetType === 'PRODUCT' && target.targetId === item.productId) ||
      (target.targetType === 'CATEGORY' && target.targetId === variantMap.get(item.variantId)?.product.categoryId) ||
      (target.targetType === 'BRAND' && target.targetId === variantMap.get(item.variantId)?.product.brandId)
    );
    const rewardLine = Math.floor(rewardDiscount * item.total / totalAmount);
    return sum + (eligible ? item.total - rewardLine : 0);
  }, 0);
  orderItemsData.forEach((item, index) => {
    const beforeDiscount = item.total;
    const itemRewardDiscount = Math.min(beforeDiscount, rewardLineShares[index]);
    rewardDiscountAllocated += itemRewardDiscount;
    const eligible = !coupon || coupon.targets.length === 0 || coupon.targets.some(target =>
      (target.targetType === 'PRODUCT' && target.targetId === item.productId) ||
      (target.targetType === 'CATEGORY' && target.targetId === variantMap.get(item.variantId)?.product.categoryId) ||
      (target.targetType === 'BRAND' && target.targetId === variantMap.get(item.variantId)?.product.brandId)
    );
    const couponBase = eligible ? beforeDiscount - itemRewardDiscount : 0;
    const couponLineDiscount = !coupon || coupon.discountType === 'FREE_DELIVERY' || !eligible ? 0
      : index === lastCouponEligibleIndex
        ? Math.min(couponBase, couponDiscount - couponDiscountAllocated)
        : eligibleCouponAfterReward > 0 ? Math.floor(couponDiscount * couponBase / eligibleCouponAfterReward) : 0;
    couponDiscountAllocated += couponLineDiscount;
    const marginCap = allowNegativeMarginPromotions || item.unitCostSnapshot === null
      ? (allowNegativeMarginPromotions ? beforeDiscount : 0)
      : Math.max(0, beforeDiscount - item.unitCostSnapshot * item.quantity);
    const appliedRewardLine = Math.min(itemRewardDiscount, marginCap);
    const appliedCouponLine = Math.min(couponLineDiscount, Math.max(0, marginCap - appliedRewardLine));
    appliedRewardDiscount += appliedRewardLine;
    appliedCouponDiscount += appliedCouponLine;
    const lineDiscount = appliedRewardLine + appliedCouponLine;
    item.discountAmountSnapshot = lineDiscount;
    item.total = beforeDiscount - lineDiscount;
    item.supplierAmountSnapshot = item.unitCostSnapshot === null ? null
      : Math.floor(Math.max(0, item.total - item.unitCostSnapshot * item.quantity) * (item.supplierProfitShareBpsSnapshot ?? 0) / 10000);
    item.platformProductProfitSnapshot = item.unitCostSnapshot === null ? null
      : item.total - item.unitCostSnapshot * item.quantity - (item.supplierAmountSnapshot ?? 0);
  });

  rewardDiscount = appliedRewardDiscount;
  couponDiscount = appliedCouponDiscount;
  totalDiscount = rewardDiscount + couponDiscount;

  const netProductTotal = Math.max(0, totalAmount - totalDiscount);
  const grandTotal = netProductTotal + shippingCost;
  const detailedAddress = `العنوان: الشارع (${addressStreet})، البناية (${addressBuilding})${addressApartment ? `، الشقة/الطابق (${addressApartment})` : ''}`;

  // 2. Create AWAITING_WHATSAPP order inside a transaction
  const reference = `ORD-${crypto.randomBytes(4).toString('hex').toUpperCase()}`;

  let order;
  try {
  order = await prisma.$transaction(async (tx) => {
    const newOrder = await tx.order.create({
      data: {
        reference,
        customerName,
        customerPhone,
        status: 'AWAITING_WHATSAPP',
        totalAmount: grandTotal,
        shippingCost,
        actualDeliveryCost,
        discountAmount: totalDiscount,
        couponDiscount,
        rewardDiscount,
        couponCodeSnapshot: coupon?.code ?? null,
        rewardNameSnapshot: [freeDeliveryReward?.name, rewardDiscount > 0 ? reward?.name : null].filter(Boolean).join(' + ') || null,
        shippingZoneNameSnapshot: zoneName,
        notes: detailedAddress,
        idempotencyKey: idempotencyKey || undefined,
        items: {
          create: orderItemsData
        },
        statusHistory: {
          create: {
            status: 'AWAITING_WHATSAPP',
            notes: `Order initiated via Web Checkout. Zone: ${zoneName}. ${detailedAddress}`
          }
        }
      }
    });
    if (coupon) {
      if (coupon.perCustomerLimit !== null) {
        const priorUses = await tx.couponRedemption.count({ where: { couponId: coupon.id, customerKey, isVoided: false } });
        if (priorUses >= coupon.perCustomerLimit) throw new Error('تم استخدام هذا الرمز الحد الأقصى المسموح به لهذا العميل');
      }
      const claimed = await tx.coupon.updateMany({
        where: { id: coupon.id, isActive: true, ...(coupon.usageLimit === null ? {} : { usageCount: { lt: coupon.usageLimit } }) },
        data: { usageCount: { increment: 1 } },
      });
      if (claimed.count !== 1) throw new Error('انتهى عدد مرات استخدام الرمز');
      await tx.couponRedemption.create({ data: { couponId: coupon.id, orderId: newOrder.id, customerKey, amount: couponDiscount } });
    }
    for (const appliedReward of [freeDeliveryReward, rewardDiscount > 0 ? reward : null].filter((rule): rule is NonNullable<typeof rule> => rule !== null)) {
      if (appliedReward.usageLimit === null) continue;
      const claimed = await tx.rewardRule.updateMany({
        where: { id: appliedReward.id, usageCount: { lt: appliedReward.usageLimit } },
        data: { usageCount: { increment: 1 } },
      });
      if (claimed.count !== 1) throw new Error('انتهى عدد مرات استخدام المكافأة');
      await tx.rewardRedemption.create({ data: {
        rewardRuleId: appliedReward.id,
        orderId: newOrder.id,
        amount: appliedReward.rewardType === 'FIXED' ? Math.min(totalAmount, appliedReward.rewardValue) : appliedReward.rewardType === 'PERCENT' ? rewardDiscount : 0,
      } });
    }
    return newOrder;
  }, { isolationLevel: 'Serializable' });
  } catch (error) {
    return { error: error instanceof Error ? error.message : 'تعذر حفظ الطلب، يرجى المحاولة مجدداً' };
  }

  // Get WhatsApp official number from database setting
  const setting = await prisma.siteSettings.findUnique({ where: { key: 'whatsapp_number' } });
  let whatsappNumber = '';
  if (setting) {
    try {
      const config = JSON.parse(setting.value);
      whatsappNumber = config.number || '';
    } catch (e) {}
  }

  if (!whatsappNumber) {
    if (process.env.NODE_ENV === 'production') {
      return { error: 'قناة الدفع والاتصال (واتساب) غير متوفرة حالياً، يرجى المحاولة لاحقاً' };
    } else {
      whatsappNumber = '962785050655'; // Development seed value
    }
  }

  // 3. Generate secure WhatsApp message
  let message = `مرحباً ميكاب ديمو،\nأود تأكيد طلبي الجديد رقم: ${reference}\n\n`;
  message += `الاسم: ${customerName}\n`;
  message += `رقم الهاتف: ${customerPhone}\n`;
  message += `منطقة التوصيل: ${zoneName}\n`;
  message += `${detailedAddress}\n\n`;
  message += `تفاصيل الطلب:\n`;
  
  for (const item of orderItemsData) {
    message += `- ${item.name} (${item.size}) x${item.quantity} = ${(item.total / 1000).toFixed(3)} د.أ\n`;
  }

  if (totalDiscount > 0) message += `\nالخصم: ${(totalDiscount / 1000).toFixed(3)} د.أ${coupon?.code ? ` (${coupon.code})` : ''}\n`;
  message += `\nرسوم التوصيل: ${(shippingCost / 1000).toFixed(3)} د.أ\n`;
  message += `الإجمالي: ${(grandTotal / 1000).toFixed(3)} د.أ\n\n`;
  message += `شكراً لكم.`;

  const encodedMessage = encodeURIComponent(message);
  const whatsappUrl = `https://wa.me/${whatsappNumber}?text=${encodedMessage}`;

  return {
    success: true,
    reference,
    whatsappUrl
  };
}

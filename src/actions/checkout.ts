'use server';

import { prisma } from '@/lib/db';
import { z } from 'zod';
import crypto from 'crypto';

const checkoutSchema = z.object({
  customerName: z.string().min(2),
  customerPhone: z.string().min(8),
  addressStreet: z.string().min(2),
  addressBuilding: z.string().min(1),
  addressApartment: z.string().optional(),
  shippingZoneId: z.string().optional(),
  idempotencyKey: z.string().optional(),
  items: z.string() // JSON string of [{ productId, variantId, quantity }]
});

export async function processCheckout(prevState: any, formData: FormData) {
  const parsed = checkoutSchema.safeParse(Object.fromEntries(formData));
  
  if (!parsed.success) {
    return { error: 'يرجى التحقق من المدخلات' };
  }

  const { customerName, customerPhone, addressStreet, addressBuilding, addressApartment, shippingZoneId, idempotencyKey, items: itemsJson } = parsed.data;
  
  let parsedItems;
  try {
    parsedItems = JSON.parse(itemsJson);
    if (!Array.isArray(parsedItems) || parsedItems.length === 0) {
      throw new Error();
    }
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
        msg += `- ${it.name} (${it.size}) x${it.quantity} = ${(it.total / 100).toFixed(2)} د.أ\n`;
      }
      
      msg += `\nرسوم التوصيل: ${(existing.shippingCost / 100).toFixed(2)} د.أ\n`;
      msg += `الإجمالي: ${(existing.totalAmount / 100).toFixed(2)} د.أ\n\n`;
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
    include: { product: { select: { nameAr: true, nameEn: true, id: true } } },
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
  }[] = [];

  for (const item of parsedItems) {
    const { productId, variantId, quantity } = item;

    if (quantity <= 0) continue;

    const variant = variantMap.get(variantId);

    if (!variant || variant.productId !== productId) {
      return { error: 'أحد المنتجات غير متوفر' };
    }

    const unitPrice = variant.price;
    const total = unitPrice * quantity;
    totalAmount += total;

    orderItemsData.push({
      productId: variant.productId,
      variantId: variant.id,
      sku: variant.sku,
      name: variant.product.nameAr,
      size: variant.name,
      quantity,
      unitPrice,
      total
    });
  }


  // Calculate Shipping from DB
  let shippingCost = 0;
  let zoneName = 'غير محدد';
  
  if (shippingZoneId) {
    const zone = await prisma.shippingZone.findUnique({
      where: { id: shippingZoneId }
    });
    if (zone && zone.isEnabled) {
      shippingCost = zone.fee;
      zoneName = zone.nameAr;
      // Optional free shipping threshold
      if (zone.freeShippingThreshold && totalAmount >= zone.freeShippingThreshold) {
        shippingCost = 0;
      }
    } else {
      // Unrecognized or disabled shipping zone: Flag for admin review
      return { error: 'منطقة التوصيل المحددة غير صالحة' };
    }
  } else {
    // If no shipping zone is supplied: Shipping cost remains 0 and flags for admin review
    return { error: 'يرجى تحديد منطقة التوصيل' };
  }

  const grandTotal = totalAmount + shippingCost;
  const detailedAddress = `العنوان: الشارع (${addressStreet})، البناية (${addressBuilding})${addressApartment ? `، الشقة/الطابق (${addressApartment})` : ''}`;

  // 2. Create AWAITING_WHATSAPP order inside a transaction
  const reference = `ORD-${crypto.randomBytes(4).toString('hex').toUpperCase()}`;

  const order = await prisma.$transaction(async (tx) => {
    const newOrder = await tx.order.create({
      data: {
        reference,
        customerName,
        customerPhone,
        status: 'AWAITING_WHATSAPP',
        totalAmount: grandTotal,
        shippingCost,
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
    return newOrder;
  });

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
    message += `- ${item.name} (${item.size}) x${item.quantity} = ${(item.total / 100).toFixed(2)} د.أ\n`;
  }
  
  message += `\nرسوم التوصيل: ${(shippingCost / 100).toFixed(2)} د.أ\n`;
  message += `الإجمالي: ${(grandTotal / 100).toFixed(2)} د.أ\n\n`;
  message += `شكراً لكم.`;

  const encodedMessage = encodeURIComponent(message);
  const whatsappUrl = `https://wa.me/${whatsappNumber}?text=${encodedMessage}`;

  return {
    success: true,
    reference,
    whatsappUrl
  };
}

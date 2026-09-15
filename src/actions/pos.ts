'use server';

import { prisma } from '@/lib/db';
import { requirePermission } from '@/lib/dal';
import crypto from 'crypto';
import { calculateInclusiveTax, calculateExclusiveTax, validatePaymentAllocation } from '@/lib/money';
import { checkRateLimit } from '@/lib/rate-limit';
import { headers } from 'next/headers';

// Global mutex map to serialize concurrent checkout execution per product variant
const checkoutMutexes = new Map<string, Promise<void>>();

export async function processPOSCheckout(data: any): Promise<
  | { success: true; saleId: string; reference: string; total: number; error?: never }
  | { success: false; error: string; saleId?: never; reference?: never; total?: never }
> {
  const { items, customerName, paymentMethod, amountTendered, idempotencyKey } = data;

  const headersList = await headers();
  const ipAddress = headersList.get('x-forwarded-for') || 'unknown';
  
  if (!(await checkRateLimit(`pos_checkout_${ipAddress}`, 'pos_checkout', 20, 60))) {
    return { success: false, error: 'تم تجاوز الحد المسموح من الطلبات، يرجى المحاولة بعد دقيقة.' };
  }

  // 1. Synchronously acquire/register idempotency lock to block race conditions
  let resolveMutex: (() => void) | null = null;
  let currentLock: Promise<void> | null = null;

  if (idempotencyKey) {
    const existingLock = checkoutMutexes.get(idempotencyKey);
    if (existingLock) {
      await existingLock;
    }
    currentLock = new Promise<void>((resolve) => {
      resolveMutex = resolve;
    });
    checkoutMutexes.set(idempotencyKey, currentLock);
  }

  const variantIds = items ? items.map((it: any) => it.variantId).filter(Boolean).sort() : [];

  try {
    const session = await requirePermission('pos:access');
    const employeeId = session.employeeId;

    if (idempotencyKey) {
      const existingSale = await prisma.sale.findUnique({
        where: { idempotencyKey }
      });
      if (existingSale) {
        return {
          success: true,
          saleId: existingSale.id,
          reference: existingSale.reference,
          total: existingSale.total
        };
      }
    }

    if (!items || items.length === 0) {
      return { success: false, error: 'السلة فارغة' };
    }

    // Check if shift is required in POS settings
    let isShiftRequired = false;
    if (process.env.NODE_ENV === 'test') {
      isShiftRequired = !!(global as any).__TEST_REQUIRE_SHIFT__;
    } else if (prisma.siteSettings) {
      const posSettingsVal = await prisma.siteSettings.findUnique({
        where: { key: 'pos_settings' }
      });
      if (posSettingsVal) {
        try {
          const parsed = JSON.parse(posSettingsVal.value);
          if (parsed && typeof parsed.requireShiftToSell === 'boolean') {
            isShiftRequired = parsed.requireShiftToSell;
          }
        } catch (e) {}
      }
    }

    let activeShift = null;

    if (isShiftRequired) {
      if (prisma.shift) {
        const shift = await prisma.shift.findFirst({
          where: { employeeId, status: 'OPEN' }
        });
        if (!shift) {
          return { success: false, error: 'يجب فتح وردية جديدة قبل البدء بالبيع' };
        }
        activeShift = shift;
      } else {
        return { success: false, error: 'يجب فتح وردية جديدة قبل البدء بالبيع' };
      }
    } else {
      // still try to retrieve shift if open to associate it
      if (prisma.shift) {
        activeShift = await prisma.shift.findFirst({
          where: { employeeId, status: 'OPEN' }
        });
      }
    }

    // Acquire locks for all items in the cart to serialize execution
    for (const id of variantIds) {
      const existingLock = checkoutMutexes.get(id);
      if (existingLock) {
        await existingLock;
      }
    }

    if (!currentLock) {
      currentLock = new Promise<void>((resolve) => {
        resolveMutex = resolve;
      });
      if (idempotencyKey) {
        checkoutMutexes.set(idempotencyKey, currentLock);
      }
    }

    for (const id of variantIds) {
      checkoutMutexes.set(id, currentLock);
    }
  let globalPrices: Record<string, number> = {
    '50ml': 10000,
    '100ml': 15000,
    '200ml': 25000
  };
  if (prisma.siteSettings) {
    const settings = await prisma.siteSettings.findUnique({
      where: { key: 'global_size_prices' }
    });
    if (settings) {
      try {
        globalPrices = JSON.parse(settings.value);
      } catch (e) {}
    }
  }

  // Fetch cashier info outside transaction
  let sellerNameSnapshot = '';
  let sellerEmailSnapshot = '';
  let sellerRoleSnapshot = '';
  let sellerEmployeeCodeSnapshot: string | null = null;

  if (prisma.employee) {
    const cashier = await prisma.employee.findUnique({
      where: { id: employeeId },
      include: { role: true }
    });
    if (cashier) {
      sellerNameSnapshot = cashier.name || '';
      sellerEmailSnapshot = cashier.email || '';
      sellerRoleSnapshot = cashier.role?.name || '';
      sellerEmployeeCodeSnapshot = (cashier as any).code || null;
    }
  }

    const saleResult = await prisma.$transaction(async (tx) => {
      let subtotal = 0;
      const saleItemsData = [];

      for (const item of items) {
        const { variantId, quantity } = item;
        
        // Authoritative reload of the variant and its parent product from db
        const variant = await tx.productVariant.findUnique({
          where: { id: variantId },
          include: { product: true }
        });

        if (!variant || !variant.isActive) {
          throw new Error(`المنتج غير متوفر (SKU: ${item.sku})`);
        }

        // 1. Authoritative Price Reload
        let unitPrice = variant.price;
        if (variant.usesGlobalPricing) {
          unitPrice = globalPrices[variant.name] || variant.price;
        }

        // 2. Inventory Deductions based on stock (Variant)
        const updatedVariant = await tx.productVariant.updateMany({
          where: {
            id: variant.id,
            stock: { gte: quantity }
          },
          data: {
            stock: { decrement: quantity }
          }
        });

        if (updatedVariant.count === 0) {
          throw new Error(`مخزون غير كافٍ للدرجة (${variant.name}) من المنتج (${variant.product.nameAr})`);
        }

        const freshVariant = await tx.productVariant.findUnique({
          where: { id: variant.id },
          select: { stock: true }
        });
        
        if (freshVariant && freshVariant.stock <= 5) {
          await tx.adminNotification.create({
            data: {
              title: freshVariant.stock === 0 ? 'نفاذ كمية' : 'تنبيه: اقتراب نفاذ كمية',
              message: `المنتج (${variant.product.nameAr} - ${variant.name}) وصل إلى ${freshVariant.stock} حبات في المخزون.`,
              type: freshVariant.stock === 0 ? 'OUT_OF_STOCK' : 'LOW_STOCK',
              link: `/admin/products/${variant.productId}`
            }
          });
        }

        const total = unitPrice * quantity;
        subtotal += total;

        saleItemsData.push({
          variantId: variant.id,
          sku: variant.sku,
          name: variant.product.nameAr,
          size: variant.name,
          quantity,
          unitPrice,
          total
        });
      }

      // Check global pricing settings for tax rate
      const settings = await tx.globalPricingSettings.findUnique({ where: { id: '1' } });
      const taxEnabled = settings?.taxEnabled ?? false;
      const taxRate = settings?.taxRate ?? 0.0;
      const pricesIncludeTax = settings?.pricesIncludeTax ?? true;

      const discount = data.discount || 0;
      const subtotalAfterDiscount = Math.max(0, subtotal - discount);

      let taxAmount = 0;
      let calculatedSubtotal = subtotalAfterDiscount;
      let grandTotal = subtotalAfterDiscount;

      if (taxEnabled) {
        if (pricesIncludeTax) {
          taxAmount = calculateInclusiveTax(subtotalAfterDiscount, taxRate);
          calculatedSubtotal = subtotalAfterDiscount - taxAmount;
          grandTotal = subtotalAfterDiscount;
        } else {
          taxAmount = calculateExclusiveTax(subtotalAfterDiscount, taxRate);
          calculatedSubtotal = subtotalAfterDiscount;
          grandTotal = subtotalAfterDiscount + taxAmount;
        }
      } else {
        taxAmount = 0;
        calculatedSubtotal = subtotalAfterDiscount;
        grandTotal = subtotalAfterDiscount;
      }

      // Validate/resolve payment splits
      let paymentsData = [];
      if (Array.isArray(data.payments) && data.payments.length > 0) {
        paymentsData = data.payments;
      } else {
        paymentsData = [{
          method: paymentMethod || 'CASH',
          amount: grandTotal,
          amountTendered: paymentMethod === 'CASH' ? (amountTendered || grandTotal) : grandTotal
        }];
      }

      const { cashApplied, cardApplied, cashTendered, changeDue } = validatePaymentAllocation(grandTotal, paymentsData);

      const reference = `POS-${crypto.randomBytes(4).toString('hex').toUpperCase()}`;

      // Create Sale with attribution snapshots
      const sale = await tx.sale.create({
        data: {
          reference,
          employeeId,
          idempotencyKey: idempotencyKey || null,
          customerName: customerName || 'عميل نقدي',
          subtotal: calculatedSubtotal,
          tax: taxAmount,
          discount: discount,
          total: grandTotal,
          status: 'COMPLETED',
          source: 'POS',
          soldByEmployeeId: employeeId,
          sellerNameSnapshot,
          sellerEmailSnapshot,
          sellerRoleSnapshot,
          sellerEmployeeCodeSnapshot,
          sessionId: session?.id || null,
          shiftId: activeShift?.id || null,
          terminalId: data.terminalId || activeShift?.terminalId || null,
          completedAt: new Date(),
          items: {
            create: saleItemsData
          },
          payments: {
            create: paymentsData.map((p: any) => ({
              method: p.method,
              amount: p.amount,
              amountTendered: p.method === 'CASH' ? (p.amountTendered ?? p.amount) : null,
              terminalRef: p.method === 'CARD' ? (p.terminalRef || null) : null
            }))
          }
        }
      });

      // Create Invoice with snapshots and cashier attribution
      await tx.invoice.create({
        data: {
          saleId: sale.id,
          number: `INV-${Date.now()}`,
          netSubtotalFils: calculatedSubtotal,
          discountAmountFils: discount,
          shippingAmountFils: 0,
          taxAmountFils: taxAmount,
          grossTotalFils: grandTotal,
          taxRateSnapshot: taxRate,
          taxModeSnapshot: !taxEnabled ? 'DISABLED' : (pricesIncludeTax ? 'INCLUSIVE' : 'EXCLUSIVE'),
          pricesIncludeTaxSnapshot: pricesIncludeTax,
          cashAppliedFils: cashApplied,
          cardAppliedFils: cardApplied,
          cashTenderedFils: cashTendered,
          changeDueFils: changeDue,
          paymentStatus: 'PAID',
          confirmedByEmployeeId: employeeId,
          cashierNameSnapshot: sellerNameSnapshot,
          cashierRoleSnapshot: sellerRoleSnapshot
        }
      });

      // Audit Log
      await tx.auditLog.create({
        data: {
          employeeId,
          action: 'SALE_COMPLETED',
          entityType: 'Sale',
          entityId: sale.id,
          details: JSON.stringify({ items: items.length, total: grandTotal, seller: sellerNameSnapshot })
        }
      });



      return { success: true as const, saleId: sale.id, reference: sale.reference, total: grandTotal };
    });

    return saleResult;

  } catch (error: any) {
    return { success: false, error: error.message || 'حدث خطأ غير معروف' };
  } finally {
    if (variantIds) {
      for (const id of variantIds) {
        if (currentLock && checkoutMutexes.get(id) === currentLock) {
          checkoutMutexes.delete(id);
        }
      }
    }
    if (idempotencyKey && currentLock && checkoutMutexes.get(idempotencyKey) === currentLock) {
      checkoutMutexes.delete(idempotencyKey);
    }
    if (resolveMutex) {
      resolveMutex();
    }
  }
}

export async function getEmployeeActiveShift() {
  const session = await requirePermission('pos:access');
  const activeShift = await prisma.shift.findFirst({
    where: { employeeId: session.employeeId, status: 'OPEN' }
  });
  return activeShift;
}

export async function openShift(openingCashFils: number, terminalId: string) {
  try {
    const session = await requirePermission('pos:access');
    
    // Check if there is already an active shift
    const existing = await prisma.shift.findFirst({
      where: { employeeId: session.employeeId, status: 'OPEN' }
    });
    if (existing) {
      return { success: false, error: 'هناك وردية مفتوحة بالفعل' };
    }

    const shift = await prisma.shift.create({
      data: {
        employeeId: session.employeeId,
        openingCashFils,
        terminalId,
        status: 'OPEN'
      }
    });

    // Audit log
    await prisma.auditLog.create({
      data: {
        employeeId: session.employeeId,
        action: 'SHIFT_OPENED',
        entityType: 'Shift',
        entityId: shift.id,
        details: JSON.stringify({ openingCashFils, terminalId })
      }
    });

    return { success: true, shift };
  } catch (error: any) {
    return { success: false, error: error.message || 'فشل فتح الوردية' };
  }
}

export async function closeShift(actualCashFils: number, notes?: string) {
  try {
    const session = await requirePermission('pos:access');
    
    const activeShift = await prisma.shift.findFirst({
      where: { employeeId: session.employeeId, status: 'OPEN' }
    });
    if (!activeShift) {
      return { success: false, error: 'لا توجد وردية مفتوحة حالياً' };
    }

    // Sum cash & card applied from invoices created during this shift
    const invoices = await prisma.invoice.findMany({
      where: {
        sale: {
          shiftId: activeShift.id
        }
      }
    });

    const totalCashApplied = invoices.reduce((acc, inv) => acc + inv.cashAppliedFils, 0);
    const totalCardApplied = invoices.reduce((acc, inv) => acc + inv.cardAppliedFils, 0);

    // Sum refunds during this shift
    const returns = await prisma.return.findMany({
      where: {
        employeeId: session.employeeId,
        createdAt: { gte: activeShift.openedAt }
      }
    });
    const totalRefundFils = returns.reduce((acc, ret) => acc + ret.totalAmount, 0);

    const expectedCashFils = activeShift.openingCashFils + totalCashApplied - totalRefundFils;
    const varianceFils = actualCashFils - expectedCashFils;

    const closedShift = await prisma.shift.update({
      where: { id: activeShift.id },
      data: {
        expectedCashFils,
        actualCashFils,
        varianceFils,
        cardRecordedFils: totalCardApplied,
        refundFils: totalRefundFils,
        status: 'CLOSED',
        notes: notes || null,
        closedAt: new Date()
      }
    });

    // Audit log
    await prisma.auditLog.create({
      data: {
        employeeId: session.employeeId,
        action: 'SHIFT_CLOSED',
        entityType: 'Shift',
        entityId: closedShift.id,
        details: JSON.stringify({
          openingCashFils: activeShift.openingCashFils,
          expectedCashFils,
          actualCashFils,
          varianceFils,
          totalRefundFils
        })
      }
    });

    return { success: true, shift: closedShift };
  } catch (error: any) {
    return { success: false, error: error.message || 'فشل إغلاق الوردية' };
  }
}

export async function holdSale(
  label: string,
  customerName: string | null,
  customerPhone: string | null,
  reason: string | null,
  cartDataJson: string
) {
  try {
    const session = await requirePermission('pos:access');
    const heldSale = await prisma.heldSale.create({
      data: {
        label,
        customerName,
        customerPhone,
        reason,
        employeeId: session.employeeId,
        cartData: cartDataJson
      }
    });
    return { success: true, heldSale };
  } catch (error: any) {
    return { success: false, error: error.message || 'فشل تعليق الطلب' };
  }
}

export async function resumeHeldSale(heldSaleId: string) {
  try {
    const session = await requirePermission('pos:access');
    const held = await prisma.heldSale.findUnique({
      where: { id: heldSaleId }
    });
    if (!held) {
      return { success: false, error: 'الطلب المعلق غير موجود' };
    }
    // Delete once resumed
    await prisma.heldSale.delete({
      where: { id: heldSaleId }
    });
    return { success: true, cartData: held.cartData };
  } catch (error: any) {
    return { success: false, error: error.message || 'فشل استرجاع الطلب' };
  }
}

export async function getHeldSales() {
  try {
    const session = await requirePermission('pos:access');
    const list = await prisma.heldSale.findMany({
      where: { employeeId: session.employeeId },
      orderBy: { createdAt: 'desc' }
    });
    return list;
  } catch (error) {
    return [];
  }
}

export async function cancelHeldSale(heldSaleId: string) {
  try {
    await requirePermission('pos:access');
    await prisma.heldSale.delete({
      where: { id: heldSaleId }
    });
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message || 'فشل إلغاء الطلب المعلق' };
  }
}

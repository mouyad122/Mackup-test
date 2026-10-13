'use server';

import { prisma } from '@/lib/db';
import { requirePermission } from '@/lib/dal';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { z } from 'zod';

const createPOSchema = z.object({
  supplierId: z.string().uuid(),
  items: z.string(), // JSON string of Array<{ variantId, quantityOrdered, unitCost }>
});

export async function createPurchaseOrder(formData: FormData) {
  const session = await requirePermission('manage:inventory');
  const input = createPOSchema.safeParse(Object.fromEntries(formData));
  if (!input.success) throw new Error('Invalid input');

  const { supplierId, items } = input.data;
  const parsedItems = JSON.parse(items) as Array<{ variantId: string, quantityOrdered: number, unitCost: number }>;
  if (!parsedItems.length) throw new Error('No items');

  const totalAmount = parsedItems.reduce((acc, item) => acc + item.unitCost * item.quantityOrdered, 0);

  const po = await prisma.purchaseOrder.create({
    data: {
      supplierId,
      reference: `PO-${Date.now().toString(36).toUpperCase()}`,
      status: 'DRAFT',
      totalAmount,
      items: {
        create: parsedItems.map(item => ({
          variantId: item.variantId,
          quantityOrdered: item.quantityOrdered,
          unitCost: item.unitCost,
        }))
      }
    }
  });

  revalidatePath('/admin/purchase-orders');
  redirect(`/admin/purchase-orders/${po.id}`);
}

export async function markPurchaseOrderSent(id: string) {
  await requirePermission('manage:inventory');
  await prisma.purchaseOrder.update({
    where: { id },
    data: { status: 'SENT' }
  });
  revalidatePath(`/admin/purchase-orders/${id}`);
}

export async function receiveGoods(formData: FormData) {
  const session = await requirePermission('manage:inventory');
  const id = formData.get('id') as string;
  const warehouseId = formData.get('warehouseId') as string;
  const itemsStr = formData.get('items') as string;
  const parsedItems = JSON.parse(itemsStr) as Array<{ id: string, variantId: string, quantityReceived: number }>;

  await prisma.$transaction(async tx => {
    const po = await tx.purchaseOrder.findUnique({
      where: { id },
      include: { items: true }
    });
    if (!po) throw new Error('PO not found');

    const receipt = await tx.goodsReceipt.create({
      data: {
        purchaseOrderId: po.id,
        reference: `GR-${Date.now().toString(36).toUpperCase()}`,
        receivedBy: session.employee.name,
      }
    });

    for (const item of parsedItems) {
      if (item.quantityReceived <= 0) continue;
      
      const poItem = po.items.find(i => i.id === item.id);
      if (!poItem) continue;

      const variant = await tx.productVariant.findUnique({ where: { id: item.variantId } });

      await tx.purchaseOrderItem.update({
        where: { id: item.id },
        data: { quantityReceived: { increment: item.quantityReceived } }
      });

      const inv = await tx.inventory.upsert({
        where: { warehouseId_variantId: { warehouseId, variantId: item.variantId } },
        create: { warehouseId, variantId: item.variantId, quantity: item.quantityReceived },
        update: { quantity: { increment: item.quantityReceived } }
      });

      await tx.inventoryMovement.create({
        data: {
          sku: variant?.sku || variant?.name || 'PO-RECEIPT',
          type: 'PURCHASE_RECEIPT',
          quantity: item.quantityReceived,
          quantityBefore: inv.quantity - item.quantityReceived,
          quantityAfter: inv.quantity,
          employeeId: session.employee.id,
          warehouseId,
          reference: receipt.reference,
        }
      });
    }

    const updatedPoItems = await tx.purchaseOrderItem.findMany({
      where: { purchaseOrderId: po.id }
    });
    const allReceived = updatedPoItems.length > 0 && updatedPoItems.every(i => i.quantityReceived >= i.quantityOrdered);

    await tx.purchaseOrder.update({
      where: { id: po.id },
      data: { status: allReceived ? 'COMPLETED' : 'PARTIAL' }
    });
  });

  revalidatePath(`/admin/purchase-orders/${id}`);
}

export async function createSupplierInvoice(formData: FormData) {
  const session = await requirePermission('manage:financials');
  const purchaseOrderId = formData.get('purchaseOrderId') as string;

  await prisma.$transaction(async tx => {
    const po = await tx.purchaseOrder.findUnique({ where: { id: purchaseOrderId } });
    if (!po) throw new Error('PO not found');

    await tx.supplierInvoice.create({
      data: {
        purchaseOrderId: po.id,
        supplierId: po.supplierId,
        reference: `INV-${Date.now().toString(36).toUpperCase()}`,
        totalAmount: po.totalAmount,
      }
    });
  });

  revalidatePath(`/admin/purchase-orders/${purchaseOrderId}`);
}

export async function paySupplierInvoice(invoiceId: string) {
  const session = await requirePermission('manage:financials');

  await prisma.$transaction(async tx => {
    const inv = await tx.supplierInvoice.findUnique({ 
      where: { id: invoiceId },
      include: { purchaseOrder: true }
    });
    if (!inv) throw new Error('Invoice not found');

    await tx.supplierInvoice.update({
      where: { id: invoiceId },
      data: { status: 'PAID', amountPaid: inv.totalAmount }
    });

    await tx.financialTransaction.create({
      data: {
        type: 'SUPPLIER_PAYMENT',
        direction: 'OUT',
        amount: inv.totalAmount,
        supplierId: inv.supplierId,
        description: `Payment for Invoice ${inv.reference}`,
        createdByEmployeeId: session.employee.id,
      }
    });
    
    // Optionally complete PO
    await tx.purchaseOrder.update({
      where: { id: inv.purchaseOrderId },
      data: { status: 'COMPLETED' }
    });
  });

  revalidatePath(`/admin/purchase-orders`);
}

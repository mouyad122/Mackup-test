import { z } from 'zod';

export const checkoutSchema = z.object({
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

export const cartItemSchema = z.object({
  productId: z.string().uuid(),
  variantId: z.string().uuid(),
  quantity: z.number().int().positive().max(100)
});

export const cartItemsSchema = z.array(cartItemSchema).min(1);

export const posCheckoutSchema = z.object({
  items: z.array(z.object({
    variantId: z.string().uuid(),
    sku: z.string().optional(),
    quantity: z.number().int().positive().max(100)
  })).min(1),
  customerName: z.string().optional(),
  paymentMethod: z.enum(['CASH', 'CARD']).optional(),
  amountTendered: z.number().nonnegative().optional(),
  idempotencyKey: z.string().max(100).optional(),
  discount: z.number().nonnegative().optional(),
  payments: z.array(z.object({
    method: z.enum(['CASH', 'CARD']),
    amount: z.number().positive(),
    amountTendered: z.number().nonnegative().optional(),
    terminalRef: z.string().optional()
  })).optional(),
  terminalId: z.string().optional()
});

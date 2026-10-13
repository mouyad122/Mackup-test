'use server';

import { requirePermission } from '@/lib/dal';
import { prisma } from '@/lib/db';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { Prisma } from '@prisma/client';

export async function approveReview(reviewId: string) {
  await requirePermission('manage:products');
  const review = await prisma.review.findUnique({ where: { id: reviewId } });
  if (!review) throw new Error('Review not found');

  await prisma.review.update({
    where: { id: reviewId },
    data: { isApproved: true }
  });
  revalidatePath('/admin/reviews');
  revalidatePath('/[locale]/(public)/products/[slug]', 'page');
}

export async function hideReview(reviewId: string) {
  await requirePermission('manage:products');
  const review = await prisma.review.findUnique({ where: { id: reviewId } });
  if (!review) throw new Error('Review not found');

  await prisma.review.update({
    where: { id: reviewId },
    data: { isApproved: false }
  });
  revalidatePath('/admin/reviews');
  revalidatePath('/[locale]/(public)/products/[slug]', 'page');
}

export async function deleteReview(reviewId: string) {
  await requirePermission('manage:products');
  const review = await prisma.review.findUnique({ where: { id: reviewId } });
  if (!review) throw new Error('Review not found');

  await prisma.review.delete({
    where: { id: reviewId }
  });
  revalidatePath('/admin/reviews');
  revalidatePath('/[locale]/(public)/products/[slug]', 'page');
}

const reviewSchema = z.object({
  productId: z.string().uuid('Product ID is invalid'),
  rating: z.number().int().min(1).max(5),
  comment: z.string().max(1000, 'Comment is too long').optional().transform(s => s?.trim() || null),
  phone: z.string().min(5, 'Phone number is too short').max(20, 'Phone number is too long'),
  firstName: z.string().min(2, 'First name is too short').max(50, 'First name is too long').transform(s => s.trim()),
});

export async function submitReview(rawProductId: string, rawRating: number, rawComment: string, rawPhone: string, rawFirstName: string) {
  const parsed = reviewSchema.safeParse({
    productId: rawProductId,
    rating: rawRating,
    comment: rawComment,
    phone: rawPhone,
    firstName: rawFirstName,
  });

  if (!parsed.success) {
    throw new Error(parsed.error.issues?.[0]?.message || 'Invalid input');
  }

  const { productId, rating, comment, phone, firstName } = parsed.data;

  // Normalize phone (strip non-digits, keep leading + if present)
  let normalizedPhone = phone.replace(/[^\d+]/g, '');
  if (!normalizedPhone.startsWith('+') && normalizedPhone.startsWith('0')) {
    // Basic local normalization for Jordan or generic if needed, but keeping it as entered minus spaces is safe enough
  }

  // Ensure product exists
  const product = await prisma.product.findUnique({ where: { id: productId } });
  if (!product) {
    throw new Error('Product not found');
  }

  // Find or create customer atomically using upsert
  const customer = await prisma.customer.upsert({
    where: { phone: normalizedPhone },
    update: {}, // Don't overwrite existing names
    create: {
      phone: normalizedPhone,
      firstName: firstName,
    }
  });

  // Rate Limiting: Max 5 reviews per hour per customer
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
  const recentReviewsCount = await prisma.review.count({
    where: {
      customerId: customer.id,
      createdAt: { gte: oneHourAgo }
    }
  });

  if (recentReviewsCount >= 5) {
    throw new Error('You have submitted too many reviews recently. Please try again later.');
  }

  // Verify Purchase Logic: Explicitly check for successful order statuses
  const hasPurchased = await prisma.orderItem.findFirst({
    where: {
      productId,
      order: {
        OR: [
          { customerId: customer.id },
          { customerPhone: normalizedPhone }
        ],
        status: { in: ['DELIVERED', 'SHIPPED'] }
      }
    }
  });

  try {
    await prisma.review.create({
      data: {
        productId,
        customerId: customer.id,
        rating,
        comment,
        isVerified: !!hasPurchased,
        // Reviews default to hidden (isApproved: false) as per updated schema.
      }
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === 'P2002') {
        throw new Error('You have already submitted a review for this product.');
      }
    }
    throw new Error('An error occurred while submitting your review.');
  }

  revalidatePath('/[locale]/(public)/products/[slug]', 'page');
}

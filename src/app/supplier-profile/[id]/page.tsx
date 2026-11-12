import { prisma } from '@/lib/db';
import { notFound } from 'next/navigation';
import { filsToDisplay } from '@/lib/money';
import { getSupplierProfitMargin } from '@/lib/supplier-margin';
import { Store, User, Phone, MapPin, ExternalLink, Printer, Share2, Check, Eye, EyeOff } from 'lucide-react';
import { Metadata } from 'next';
import SupplierProfileClient from './SupplierProfileClient';

interface Props {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const supplier = await prisma.supplier.findUnique({
    where: { id },
    select: { name: true, ownerName: true },
  });

  if (!supplier) return { title: 'بيانات المحل غير موجودة · رَواق' };

  return {
    title: `بيانات المحل والأصناف: ${supplier.name} · رَواق`,
    description: `كشف بيانات المحل الشريك، الأصناف، أسعار التكلفة وسعر البيع وحالة العرض في المتجر · رَواق`,
  };
}

export default async function SupplierProfilePage({ params }: Props) {
  const { id } = await params;

  const supplier = await prisma.supplier.findUnique({
    where: { id },
    include: {
      locations: true,
      offers: {
        include: {
          variant: {
            include: {
              product: {
                include: {
                  images: { orderBy: { order: 'asc' } },
                },
              },
              shade: true,
              images: true,
            },
          },
        },
        orderBy: { updatedAt: 'desc' },
      },
    },
  });

  if (!supplier) {
    notFound();
  }

  const [profitMargin, supplierOrders, supplierTransactions] = await Promise.all([
    getSupplierProfitMargin(prisma, supplier.id),
    prisma.order.findMany({
      where: {
        status: {
          in: ['CONFIRMED', 'PREPARING', 'PREPARED', 'ASSIGNED', 'SHIPPED', 'OUT_FOR_DELIVERY', 'DELIVERED', 'REFUNDED'],
        },
        items: { some: { supplierIdSnapshot: supplier.id } },
      },
      select: {
        items: {
          where: { supplierIdSnapshot: supplier.id },
          select: { total: true },
        },
      },
    }),
    prisma.financialTransaction.findMany({
      where: {
        supplierId: supplier.id,
        type: { in: ['SUPPLIER_OBLIGATION', 'SUPPLIER_OBLIGATION_REVERSAL', 'SUPPLIER_PAYMENT'] },
      },
      select: { type: true, amount: true },
    }),
  ]);

  const totalSalesFils = supplierOrders.reduce(
    (acc, o) => acc + o.items.reduce((sum, item) => sum + item.total, 0),
    0
  );

  const obligationFils =
    supplierTransactions
      .filter((tx) => tx.type === 'SUPPLIER_OBLIGATION')
      .reduce((sum, tx) => sum + tx.amount, 0) -
    supplierTransactions
      .filter((tx) => tx.type === 'SUPPLIER_OBLIGATION_REVERSAL')
      .reduce((sum, tx) => sum + tx.amount, 0);

  const paidFils = supplierTransactions
    .filter((tx) => tx.type === 'SUPPLIER_PAYMENT')
    .reduce((sum, tx) => sum + tx.amount, 0);

  const remainingBalanceFils = Math.max(0, obligationFils - paidFils);

  let cleanPhone = (supplier.phone || '').replace(/\D/g, '');
  if (cleanPhone.startsWith('07')) cleanPhone = '962' + cleanPhone.substring(1);
  else if (cleanPhone.startsWith('7')) cleanPhone = '962' + cleanPhone;

  const mapUrl =
    supplier.mapLocationUrl ||
    supplier.locations?.[0]?.mapLocationUrl ||
    (supplier.address ? `https://maps.google.com/?q=${encodeURIComponent(supplier.address + ' الأردن')}` : null);

  const serializedOffers = supplier.offers.map((offer) => {
    const mainImage =
      offer.variant.mainImage ||
      offer.variant.images?.[0]?.url ||
      offer.variant.product.images?.[0]?.url ||
      null;

    const isVisibleInStore = offer.variant.product.isVisible && offer.isActive;

    // استخراج مواصفات المقاس واللون لدمجها مع اسم الصنف في سطر واحد
    const rawSize = offer.variant.size?.trim();
    const isStandardSize = !rawSize || ['STANDARD', 'DEFAULT', 'ONE SIZE', 'OS', 'عادي', 'قياسي', '—', '-'].includes(rawSize.toUpperCase());
    const rawColor = offer.variant.colorName?.trim();
    const shadeName = offer.variant.shade?.name?.trim();

    const specParts: string[] = [];
    if (rawSize && !isStandardSize) {
      specParts.push(rawSize);
    }
    const colorVal = [rawColor, shadeName].filter(Boolean).filter((v, i, a) => a.indexOf(v) === i).join(' - ');
    if (colorVal) {
      specParts.push(colorVal);
    } else if (offer.variant.name && offer.variant.name.trim() && offer.variant.name.trim() !== offer.variant.product.nameAr.trim()) {
      specParts.push(offer.variant.name.trim());
    }

    const variantSpecs = specParts.join(' · ');
    const fullDisplayName = variantSpecs
      ? `${offer.variant.product.nameAr} - ${variantSpecs}`
      : offer.variant.product.nameAr;

    return {
      id: offer.id,
      productId: offer.variant.productId,
      productNameAr: offer.variant.product.nameAr,
      productNameEn: offer.variant.product.nameEn,
      size: offer.variant.size,
      variantSpecs,
      fullDisplayName,
      sku: offer.supplierSku || offer.variant.sku,
      image: mainImage,
      costPriceFils: offer.unitCost,
      sellingPriceFils: offer.variant.price,
      isVisibleInStore,
      isProductVisible: offer.variant.product.isVisible,
      isOfferActive: offer.isActive,
      profitShareBps: offer.supplierProfitShareBps,
    };
  });

  return (
    <SupplierProfileClient
      supplier={{
        id: supplier.id,
        name: supplier.name,
        ownerName: supplier.ownerName,
        phone: supplier.phone,
        cleanPhone,
        email: supplier.email,
        address: supplier.address,
        mapUrl,
        profitMargin,
        isActive: supplier.isActive,
        totalSalesFils,
        obligationFils,
        paidFils,
        remainingBalanceFils,
      }}
      offers={serializedOffers}
    />
  );
}

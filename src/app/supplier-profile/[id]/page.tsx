import { prisma } from '@/lib/db';
import { notFound } from 'next/navigation';
import { getSupplierProfitMargin } from '@/lib/supplier-margin';
import { groupSupplierOffersByProduct } from '@/lib/supplier-products';
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

  const groupedProducts = groupSupplierOffersByProduct(supplier.offers as any);

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
      products={groupedProducts}
    />
  );
}

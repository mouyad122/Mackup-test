import { prisma } from '@/lib/db';
import { notFound } from 'next/navigation';
import { headers } from 'next/headers';
import { requirePermission } from '@/lib/dal';
import { filsToDisplay } from '@/lib/money';
import DeliveryManifestClient from './DeliveryManifestClient';

export default async function DeliveryBatchPage({
  params,
  searchParams,
}: {
  params: Promise<{ reference: string }>;
  searchParams: Promise<{ token?: string }>;
}) {
  const [{ reference }, { token }] = await Promise.all([params, searchParams]);

  const batch = await prisma.deliveryBatch.findUnique({
    where: { reference },
    include: {
      orders: {
        orderBy: { createdAt: 'desc' },
        include: {
          items: true,
          deliveryJob: true,
          fulfillmentOrders: {
            include: {
              supplier: {
                include: {
                  locations: true,
                },
              },
              location: true,
              packages: {
                include: {
                  items: {
                    include: {
                      fulfillmentItem: true,
                    },
                  },
                },
              },
              items: true,
            },
          },
        },
      },
    },
  });

  if (!batch) {
    return notFound();
  }

  if (batch.secureToken) {
    if (!token || token !== batch.secureToken) return notFound();
  } else {
    // Older batches predate capability links and remain staff-only.
    await requirePermission('manage:orders');
  }

  // Shared delivery links expire after 60 days
  const sixtyDaysAgo = new Date();
  sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() - 60);
  if (batch.createdAt < sixtyDaysAgo) {
    return notFound();
  }

  // 1. تجميع محطات الاستلام حسب المحل / موقع المحل (Stop Aggregation)
  const pickupStopsMap = new Map<string, any>();
  let totalParcelsCount = 0;
  let totalCodFils = 0;

  for (const order of batch.orders) {
    const isCodPending = order.paymentStatus === 'COD_PENDING' || order.paymentStatus === 'UNPAID';
    if (isCodPending) {
      totalCodFils += order.totalAmount;
    }

    if (order.fulfillmentOrders && order.fulfillmentOrders.length > 0) {
      for (const fo of order.fulfillmentOrders) {
        const stopKey = fo.locationId || fo.supplierId || `supplier-${fo.supplier?.id}`;
        const supplierName = fo.supplier?.name || 'محل رَواق';
        const locationLabel = fo.location?.label || 'المقر الرئيسي';
        const contactPerson = fo.supplier?.ownerName || fo.location?.contactPerson || supplierName;
        const contactPhone = fo.location?.contactPhone || fo.supplier?.phone || '';
        const address =
          fo.pickupAddressSnapshot ||
          fo.location?.addressDetails ||
          fo.supplier?.address ||
          `${fo.location?.city || 'عمان'}`;
        const city = fo.location?.city || 'عمان';

        const lat = fo.location?.latitude;
        const lng = fo.location?.longitude;
        const googleMapsUrl =
          fo.supplier?.mapLocationUrl ||
          fo.location?.mapLocationUrl ||
          (lat && lng
            ? `https://maps.google.com/?q=${lat},${lng}`
            : `https://maps.google.com/?q=${encodeURIComponent(`${address}, ${city}, الأردن`)}`);

        if (!pickupStopsMap.has(stopKey)) {
          pickupStopsMap.set(stopKey, {
            shopKey: stopKey,
            supplierName,
            locationLabel,
            contactPerson,
            contactPhone,
            address,
            city,
            googleMapsUrl,
            pickupInstructions: fo.location?.pickupInstructions,
            parcels: [],
          });
        }

        const stop = pickupStopsMap.get(stopKey);

        // إضافة الطرود
        if (fo.packages && fo.packages.length > 0) {
          for (const pkg of fo.packages) {
            totalParcelsCount += 1;
            stop.parcels.push({
              packageCode: pkg.packageCode,
              orderReference: order.reference,
              items: pkg.items.map((pi) => ({
                name: pi.fulfillmentItem?.productTitle || 'منتج',
                variantTitle: pi.fulfillmentItem?.variantTitle,
                quantity: pi.quantity,
              })),
            });
          }
        } else {
          // في حال لم تُنشأ طرود بعد، نضع طرداً افتراضياً
          totalParcelsCount += 1;
          stop.parcels.push({
            packageCode: `PKG-${order.reference}-${supplierName.slice(0, 3)}`,
            orderReference: order.reference,
            items: fo.items.map((it) => ({
              name: it.productTitle,
              variantTitle: it.variantTitle,
              quantity: it.quantity,
            })),
          });
        }
      }
    } else {
      // طلب ليس له تقسيم محلات بعد (طلب مباشر من المتجر)
      const stopKey = 'rawaq-central-hub';
      if (!pickupStopsMap.has(stopKey)) {
        pickupStopsMap.set(stopKey, {
          shopKey: stopKey,
          supplierName: 'مستودع رَواق المركزي',
          locationLabel: 'المقر الرئيسي',
          contactPerson: 'إدارة العمليات',
          contactPhone: '0790924636',
          address: 'عمان، الأردن',
          city: 'عمان',
          googleMapsUrl: 'https://maps.google.com/?q=Amman,Jordan',
          parcels: [],
        });
      }
      totalParcelsCount += 1;
      pickupStopsMap.get(stopKey).parcels.push({
        packageCode: `PKG-${order.reference}-1`,
        orderReference: order.reference,
        items: order.items.map((it) => ({
          name: it.name,
          variantTitle: it.size,
          quantity: it.quantity,
        })),
      });
    }
  }

  const pickupStops = Array.from(pickupStopsMap.values());

  // 2. تجميع محطات التسليم للعملاء
  const dropoffStops = batch.orders.map((order) => {
    const isPaid = order.paymentStatus === 'PAID';
    const city = order.deliveryJob?.city || order.shippingZoneNameSnapshot || 'عمان';
    const address = order.deliveryJob?.addressDetails || order.notes || 'عمان';
    const googleMapsUrl =
      order.deliveryJob?.mapLocationUrl ||
      `https://maps.google.com/?q=${encodeURIComponent(`${address}, ${city}, الأردن`)}`;

    const packageCodes = order.fulfillmentOrders?.flatMap((fo) =>
      fo.packages.map((p) => p.packageCode)
    ) || [`PKG-${order.reference}`];

    const isDelivered = order.status === 'DELIVERED' || order.fulfillmentStatus === 'DELIVERED';

    return {
      orderId: order.id,
      orderReference: order.reference,
      customerName: order.customerName,
      customerPhone: order.customerPhone,
      city,
      address,
      googleMapsUrl,
      notes: order.notes,
      codAmountFils: isPaid ? 0 : order.totalAmount,
      isPaid,
      status: order.status,
      fulfillmentStatus: order.fulfillmentStatus,
      isDelivered,
      deliveredAt: order.deliveryJob?.collectedAt ? order.deliveryJob.collectedAt.toISOString() : null,
      packageCodes: packageCodes.length > 0 ? packageCodes : [`PKG-${order.reference}`],
    };
  });

  // 3. بناء نص رسالة واتساب الشاملة لسائقي شركة التوصيل
  let baseUrl = (process.env.PUBLIC_APP_URL || process.env.NEXT_PUBLIC_APP_URL || 'https://rawaq.jo').replace(/\/+$/, '');
  try {
    const headerList = await headers();
    const host = headerList.get('x-forwarded-host') || headerList.get('host');
    const proto =
      headerList.get('x-forwarded-proto') ||
      (host && (host.startsWith('localhost') || host.startsWith('127.0.0.1')) ? 'http' : 'https');
    if (host) baseUrl = `${proto}://${host}`;
  } catch {}
  const manifestUrl = `${baseUrl}/delivery/${batch.reference}${batch.secureToken ? `?token=${encodeURIComponent(batch.secureToken)}` : ''}`;

  let formattedWhatsAppText =
    `📋 *كشف إرسالية شركة التوصيل - رَواق (RAWAQ)*\n` +
    `رقم الإرسالية: *${batch.reference}*\n` +
    `📦 عدد الطلبات: ${batch.orders.length} طلبات\n` +
    `🏪 المحلات المطلوب زيارتها: *${pickupStops.length} محلات*\n` +
    `🏷️ إجمالي الطرود: ${totalParcelsCount} طرد\n` +
    `💰 إجمالي مبالغ التحصيل COD: *${filsToDisplay(totalCodFils)}*\n` +
    `🔗 رابط الكشف المباشر والخرائط: ${manifestUrl}\n\n` +
    `═══════════════════════\n` +
    `📍 *المرحلة الأولى: محطات الاستلام من المحلات:*\n`;

  pickupStops.forEach((stop, idx) => {
    formattedWhatsAppText +=
      `\n*${idx + 1}. ${stop.supplierName} (${stop.locationLabel})*\n` +
      `👤 المسؤول: ${stop.contactPerson}\n` +
      `📞 هاتف: ${stop.contactPhone || '—'}\n` +
      `📌 العنوان: ${stop.address}\n` +
      `🗺️ الخريطة: ${stop.googleMapsUrl}\n` +
      `📦 الطرود المطلوبة (${stop.parcels.length}): ${stop.parcels.map((p: any) => p.packageCode).join('، ')}\n`;
  });

  formattedWhatsAppText +=
    `\n═══════════════════════\n` +
    `🚚 *المرحلة الثانية: محطات التسليم للزبونات والتحصيل:*\n`;

  dropoffStops.forEach((drop, idx) => {
    formattedWhatsAppText +=
      `\n*${idx + 1}. طلب #${drop.orderReference} - ${drop.customerName}*\n` +
      `📞 هاتف: ${drop.customerPhone}\n` +
      `📍 العنوان: ${drop.city} - ${drop.address}\n` +
      `💰 التحصيل المطلوب: *${drop.isPaid ? '0.00 د.أ (مدفوع)' : filsToDisplay(drop.codAmountFils)}*\n` +
      `🏷️ الطرود: ${drop.packageCodes.join('، ')}\n`;
  });

  formattedWhatsAppText += `\n✨ بالتوفيق في التوصيل - فريق رَواق اللوجستي`;

  return (
    <DeliveryManifestClient
      batch={{
        reference: batch.reference,
        secureToken: batch.secureToken || undefined,
        createdAt: batch.createdAt,
        status: batch.status,
      }}
      metrics={{
        ordersCount: batch.orders.length,
        uniqueShopsCount: pickupStops.length,
        totalParcelsCount,
        totalCodFils,
      }}
      pickupStops={pickupStops}
      dropoffStops={dropoffStops}
      formattedWhatsAppText={formattedWhatsAppText}
    />
  );
}

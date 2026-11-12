import { requirePermission } from '@/lib/dal';
import { prisma } from '@/lib/db';
import { filsToDisplay } from '@/lib/money';
import { AdminSidebar } from '@/components/AdminSidebar';
import Link from 'next/link';
import { createSupplier, updateSupplier, setSupplierOfferActive, toggleProductVisibilityFromSupplierAction } from '@/actions/suppliers';
import { DeleteSupplierButton } from './DeleteSupplierButton';
import { getSupplierProfitMargin } from '@/lib/supplier-margin';
import { Store, User, Phone, MapPin, ExternalLink, Percent, Mail, Eye, EyeOff, Image as ImageIcon } from 'lucide-react';

export default async function SuppliersPage() {
  const session = await requirePermission('manage:settings');
  const [suppliers, orders, supplierTransactions] = await Promise.all([
    prisma.supplier.findMany({
      orderBy: { name: 'asc' },
      include: {
        locations: true,
        offers: {
          include: {
            variant: {
              include: {
                product: {
                  include: {
                    images: { orderBy: { order: 'asc' }, take: 1 },
                  },
                },
                shade: true,
                images: { take: 1 },
              },
            },
            inventoryMovements: { orderBy: { createdAt: 'desc' }, take: 5 },
          },
          orderBy: { updatedAt: 'desc' },
        },
      },
    }),
    prisma.order.findMany({
      where: {
        status: {
          in: [
            'CONFIRMED',
            'PREPARING',
            'PREPARED',
            'ASSIGNED',
            'SHIPPED',
            'OUT_FOR_DELIVERY',
            'DELIVERED',
            'REFUNDED',
          ],
        },
        items: { some: { supplierIdSnapshot: { not: null } } },
      },
      orderBy: { createdAt: 'desc' },
      include: {
        items: {
          where: { supplierIdSnapshot: { not: null } },
          select: {
            supplierIdSnapshot: true,
            unitCostSnapshot: true,
            supplierAmountSnapshot: true,
            quantity: true,
            total: true,
          },
        },
      },
    }),
    prisma.financialTransaction.findMany({
      where: {
        supplierId: { not: null },
        type: { in: ['SUPPLIER_OBLIGATION', 'SUPPLIER_OBLIGATION_REVERSAL', 'SUPPLIER_PAYMENT'] },
      },
      select: { supplierId: true, type: true, amount: true },
    }),
  ]);

  const supplierMargins = new Map(
    await Promise.all(
      suppliers.map(
        async (supplier) => [supplier.id, await getSupplierProfitMargin(prisma, supplier.id)] as const
      )
    )
  );

  return (
    <div className="flex min-h-screen flex-col bg-[var(--color-ivory-100)] md:flex-row" dir="rtl">
      <AdminSidebar employeeName={session.employee.name} roleName={session.employee.role.name} />
      <main className="min-w-0 max-w-full w-full flex-1 space-y-6 overflow-y-auto p-4 md:p-8">
        <header>
          <h1 className="font-heading text-3xl font-bold text-[#3F4832]">المحلات والعروض</h1>
          <p className="mt-1 text-sm text-zinc-600">
            إدارة بيانات المحلات، أصحاب المحلات، أرقام واتساب، ومواقع الخرائط لتسهيل التنسيق والتوصيل.
          </p>
        </header>

        {/* Create Shop Form */}
        <section className="grid gap-5 xl:grid-cols-2">
          <form
            action={createSupplier}
            className="grid gap-3.5 rounded-2xl border border-zinc-200 bg-white p-5 shadow-xs"
          >
            <div className="flex items-center gap-2 border-b border-zinc-100 pb-3">
              <Store className="w-5 h-5 text-[#3F4832]" />
              <h2 className="font-extrabold text-base text-zinc-900">إضافة محل جديد</h2>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1">
                <label className="text-xs font-bold text-zinc-700">اسم المحل *</label>
                <input
                  name="name"
                  required
                  minLength={2}
                  maxLength={120}
                  placeholder="مثال: متجر لافندر للعبايات"
                  className="w-full rounded-xl border border-zinc-200 px-3 py-2 text-xs focus:ring-1 focus:ring-[#3F4832] focus:outline-none"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-zinc-700">اسم صاحب المحل / المسؤول *</label>
                <input
                  name="ownerName"
                  placeholder="مثال: محمد العمري"
                  className="w-full rounded-xl border border-zinc-200 px-3 py-2 text-xs focus:ring-1 focus:ring-[#3F4832] focus:outline-none"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-zinc-700">رقم التواصل واتساب *</label>
                <input
                  name="phone"
                  required
                  placeholder="مثال: 0791234567"
                  dir="ltr"
                  className="w-full rounded-xl border border-zinc-200 px-3 py-2 text-xs font-mono focus:ring-1 focus:ring-[#3F4832] focus:outline-none"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-zinc-700">البريد الإلكتروني (اختياري)</label>
                <input
                  type="email"
                  name="email"
                  placeholder="shop@example.com"
                  dir="ltr"
                  className="w-full rounded-xl border border-zinc-200 px-3 py-2 text-xs focus:ring-1 focus:ring-[#3F4832] focus:outline-none"
                />
              </div>

              <div className="space-y-1 sm:col-span-2">
                <label className="text-xs font-bold text-zinc-700">رابط موقع المحل على الخريطة (Google Maps URL)</label>
                <input
                  name="mapLocationUrl"
                  placeholder="https://maps.google.com/?q=..."
                  dir="ltr"
                  className="w-full rounded-xl border border-zinc-200 px-3 py-2 text-xs font-mono focus:ring-1 focus:ring-[#3F4832] focus:outline-none"
                />
              </div>

              <div className="space-y-1 sm:col-span-2">
                <label className="text-xs font-bold text-zinc-700">العنوان التفصيلي للمحل</label>
                <input
                  name="address"
                  placeholder="عمان - الصويفية، شارع الوكالات، مجمع رقم 12"
                  className="w-full rounded-xl border border-zinc-200 px-3 py-2 text-xs focus:ring-1 focus:ring-[#3F4832] focus:outline-none"
                />
              </div>

              <div className="space-y-1 sm:col-span-2">
                <label className="text-xs font-bold text-zinc-700">حصة المحل من الربح %</label>
                <input
                  name="profitMargin"
                  type="number"
                  min="0"
                  max="100"
                  defaultValue="0"
                  placeholder="نسبة الربح %"
                  className="w-full rounded-xl border border-zinc-200 px-3 py-2 text-xs focus:ring-1 focus:ring-[#3F4832] focus:outline-none"
                />
              </div>
            </div>

            <button className="justify-self-start rounded-xl bg-[#3F4832] hover:bg-[#2d3424] px-6 py-2.5 font-bold text-xs text-white transition shadow-xs">
              حفظ المحل
            </button>
          </form>
        </section>

        {/* Shops List */}
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-extrabold text-zinc-900">سجل المحلات الشريكة ({suppliers.length})</h2>
          </div>

          {suppliers.map((supplier) => {
            const supplierOrders = orders.filter((order) =>
              order.items.some((item) => item.supplierIdSnapshot === supplier.id)
            );
            const supplierTx = supplierTransactions.filter((tx) => tx.supplierId === supplier.id);
            const owed =
              supplierTx
                .filter((tx) => tx.type === 'SUPPLIER_OBLIGATION')
                .reduce((n, tx) => n + tx.amount, 0) -
              supplierTx
                .filter((tx) => tx.type === 'SUPPLIER_OBLIGATION_REVERSAL')
                .reduce((n, tx) => n + tx.amount, 0);
            const paid = supplierTx
              .filter((tx) => tx.type === 'SUPPLIER_PAYMENT')
              .reduce((n, tx) => n + tx.amount, 0);
            const sourcedSales = supplierOrders.reduce(
              (n, order) =>
                n +
                order.items
                  .filter((item) => item.supplierIdSnapshot === supplier.id)
                  .reduce((s, item) => s + item.total, 0),
              0
            );
            const activeProducts = new Set(
              supplier.offers.filter((o) => o.isActive).map((o) => o.variant.productId)
            ).size;

            let cleanPhone = (supplier.phone || '').replace(/\D/g, '');
            if (cleanPhone.startsWith('07')) cleanPhone = '962' + cleanPhone.substring(1);
            else if (cleanPhone.startsWith('7')) cleanPhone = '962' + cleanPhone;

            const mapUrl =
              supplier.mapLocationUrl ||
              supplier.locations?.[0]?.mapLocationUrl ||
              (supplier.address
                ? `https://maps.google.com/?q=${encodeURIComponent(supplier.address + ' الأردن')}`
                : null);

            return (
              <article
                key={supplier.id}
                className="overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-xs"
              >
                {/* Header Bar */}
                <div className="flex flex-wrap items-start justify-between gap-3 border-b border-zinc-100 p-5">
                  <div className="space-y-1.5">
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="font-extrabold text-base text-zinc-900">{supplier.name}</h2>
                      {supplier.ownerName && (
                        <span className="text-xs font-bold text-zinc-600 bg-zinc-100 px-2.5 py-0.5 rounded-full flex items-center gap-1">
                          <User className="w-3 h-3 text-zinc-400" />
                          <span>المسؤول: {supplier.ownerName}</span>
                        </span>
                      )}
                      <span className="text-xs font-bold text-emerald-800 bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 rounded-full">
                        نسبة الربح: {supplierMargins.get(supplier.id) ?? 0}%
                      </span>
                    </div>

                    <div className="flex flex-wrap items-center gap-4 text-xs text-zinc-600 pt-1">
                      {supplier.phone && (
                        <div className="flex items-center gap-1 font-mono">
                          <Phone className="w-3.5 h-3.5 text-zinc-400" />
                          <span dir="ltr">{supplier.phone}</span>
                          <a
                            href={`https://wa.me/${cleanPhone}`}
                            target="_blank"
                            rel="noreferrer"
                            className="mr-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 hover:bg-emerald-100 transition"
                          >
                            محادثة واتساب 💬
                          </a>
                        </div>
                      )}

                      {supplier.address && (
                        <div className="flex items-center gap-1 text-zinc-600">
                          <MapPin className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
                          <span>{supplier.address}</span>
                        </div>
                      )}

                      {mapUrl && (
                        <a
                          href={mapUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="flex items-center gap-1 font-bold text-blue-700 hover:underline"
                        >
                          <ExternalLink className="w-3 h-3" />
                          <span>فتح موقع المحل على الخريطة</span>
                        </a>
                      )}
                    </div>

                    <div className="flex flex-wrap items-center gap-2 pt-2">
                      <Link
                        href={`/supplier-profile/${supplier.id}`}
                        target="_blank"
                        className="inline-flex items-center gap-1.5 bg-emerald-950 text-amber-300 hover:bg-emerald-900 px-3.5 py-1.5 rounded-xl text-xs font-bold transition shadow-2xs"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                        <span>عرض بيانات المحل للمشاركة 👁️</span>
                      </Link>

                      {supplier.phone && (
                        <a
                          href={`https://wa.me/${cleanPhone}?text=${encodeURIComponent(`مرحباً ${supplier.ownerName || supplier.name}،\nإليك رابط كشف بيانات محلك والأصناف وأسعار التكلفة وسعر البيع في المتجر على منصة رَواق:\nhttps://rawaq.jo/supplier-profile/${supplier.id}`)}`}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1.5 bg-[#25D366] hover:bg-[#1ebe5d] text-white px-3.5 py-1.5 rounded-xl text-xs font-bold transition shadow-2xs"
                        >
                          <span>إرسال الرابط للمحل واتساب 📲</span>
                        </a>
                      )}
                    </div>
                  </div>

                  <div className="text-left text-xs text-zinc-500 space-y-1">
                    <p>
                      {supplier.isActive ? 'محل نشط' : 'محل غير نشط'} · منتجات نشطة {activeProducts} · عروض{' '}
                      {supplier.offers.filter((o) => o.isActive).length}
                    </p>
                    <p className="font-mono">
                      مبيعات: {filsToDisplay(sourcedSales)} · الالتزام: {filsToDisplay(owed)} · المدفوع:{' '}
                      {filsToDisplay(paid)} · المتبقي: {filsToDisplay(owed - paid)}
                    </p>
                  </div>
                </div>

                {/* Edit Shop Details Accordion */}
                <details className="border-b border-zinc-100 p-4 bg-zinc-50/50">
                  <summary className="cursor-pointer font-bold text-xs text-zinc-700 hover:text-zinc-900">
                    تعديل بيانات المحل والموقع والمسؤول ونسبة الربح
                  </summary>
                  <form
                    action={updateSupplier.bind(null, supplier.id)}
                    className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4 bg-white p-4 rounded-xl border border-zinc-200"
                  >
                    <div className="space-y-1">
                      <label className="text-[11px] font-bold text-zinc-600">اسم المحل *</label>
                      <input
                        name="name"
                        defaultValue={supplier.name}
                        required
                        minLength={2}
                        className="w-full rounded-lg border border-zinc-200 p-2 text-xs"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[11px] font-bold text-zinc-600">اسم صاحب المحل</label>
                      <input
                        name="ownerName"
                        defaultValue={supplier.ownerName || ''}
                        className="w-full rounded-lg border border-zinc-200 p-2 text-xs"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[11px] font-bold text-zinc-600">رقم واتساب *</label>
                      <input
                        name="phone"
                        defaultValue={supplier.phone || ''}
                        dir="ltr"
                        className="w-full rounded-lg border border-zinc-200 p-2 text-xs font-mono"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[11px] font-bold text-zinc-600">حصة المحل من الربح %</label>
                      <input
                        name="profitMargin"
                        type="number"
                        min="0"
                        max="100"
                        step="1"
                        required
                        defaultValue={supplierMargins.get(supplier.id) ?? 0}
                        className="w-full rounded-lg border border-zinc-200 p-2 text-xs"
                      />
                    </div>
                    <div className="space-y-1 sm:col-span-2">
                      <label className="text-[11px] font-bold text-zinc-600">رابط موقع المحل على الخريطة</label>
                      <input
                        name="mapLocationUrl"
                        defaultValue={supplier.mapLocationUrl || ''}
                        dir="ltr"
                        className="w-full rounded-lg border border-zinc-200 p-2 text-xs font-mono"
                      />
                    </div>
                    <div className="space-y-1 sm:col-span-2">
                      <label className="text-[11px] font-bold text-zinc-600">العنوان التفصيلي</label>
                      <input
                        name="address"
                        defaultValue={supplier.address || ''}
                        className="w-full rounded-lg border border-zinc-200 p-2 text-xs"
                      />
                    </div>
                    <div className="sm:col-span-2 lg:col-span-4 flex items-center gap-2 pt-2">
                      <button className="rounded-xl bg-zinc-900 hover:bg-black px-5 py-2 text-xs font-bold text-white transition">
                        حفظ تعديلات المحل
                      </button>
                      <DeleteSupplierButton supplierId={supplier.id} supplierName={supplier.name} />
                    </div>
                  </form>
                </details>

                {/* Offers list */}
                {supplier.offers.length ? (
                  <div className="overflow-x-auto">
                    <table className="w-full min-w-[880px] text-right text-xs">
                      <thead className="bg-zinc-50 text-zinc-500 font-bold border-b border-zinc-100">
                        <tr>
                          <th className="p-3 text-center w-14">الصورة</th>
                          <th className="p-3">اسم الصنف والمنتج والمواصفات</th>
                          <th className="p-3">كود الصنف لدى المحل</th>
                          <th className="p-3">سعر التكلفة</th>
                          <th className="p-3">سعر البيع في المتجر</th>
                          <th className="p-3 text-center">حالة الصنف في المتجر</th>
                          <th className="p-3">حصة المحل</th>
                          <th className="p-3 text-center">تفعيل العرض</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-zinc-100">
                        {supplier.offers.map((offer) => {
                          const mainImage =
                            offer.variant.mainImage ||
                            offer.variant.images?.[0]?.url ||
                            offer.variant.product.images?.[0]?.url ||
                            null;
                          const isProductVisible = offer.variant.product.isVisible;
                          const isVisibleInStore = isProductVisible && offer.isActive;

                          // تجميع المقاس واللون في سطر واحد
                          const rawSize = offer.variant.size?.trim();
                          const isStandardSize = !rawSize || ['STANDARD', 'DEFAULT', 'ONE SIZE', 'OS', 'عادي', 'قياسي', '—', '-'].includes(rawSize.toUpperCase());
                          const rawColor = offer.variant.colorName?.trim();
                          const shadeName = offer.variant.shade?.name?.trim();

                          const specParts: string[] = [];
                          if (rawSize && !isStandardSize) specParts.push(rawSize);
                          const colorVal = [rawColor, shadeName].filter(Boolean).filter((v, i, a) => a.indexOf(v) === i).join(' - ');
                          if (colorVal) specParts.push(colorVal);

                          const variantSpecs = specParts.join(' · ');

                          return (
                            <tr key={offer.id} className="hover:bg-zinc-50/50">
                              <td className="p-2.5 text-center">
                                {mainImage ? (
                                  <div className="w-10 h-10 rounded-lg border border-zinc-200 bg-white overflow-hidden mx-auto shadow-2xs">
                                    {/* eslint-disable-next-line @next/next/no-img-element */}
                                    <img
                                      src={mainImage}
                                      alt={offer.variant.product.nameAr}
                                      className="w-full h-full object-cover"
                                    />
                                  </div>
                                ) : (
                                  <div className="w-10 h-10 rounded-lg border border-dashed border-zinc-300 bg-zinc-50 flex items-center justify-center mx-auto text-zinc-400">
                                    <ImageIcon className="w-4 h-4" />
                                  </div>
                                )}
                              </td>
                              <td className="p-3">
                                <div className="flex flex-wrap items-center gap-1.5">
                                  <strong className="font-bold text-zinc-900 text-xs">
                                    {offer.variant.product.nameAr}
                                  </strong>
                                  {variantSpecs && (
                                    <span className="inline-flex items-center gap-1 font-bold text-emerald-950 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded text-[11px] whitespace-nowrap">
                                      {variantSpecs}
                                    </span>
                                  )}
                                </div>
                                {offer.variant.product.nameEn && (
                                  <span className="text-[10px] text-zinc-400 block font-normal mt-0.5">
                                    {offer.variant.product.nameEn}
                                  </span>
                                )}
                              </td>
                              <td className="p-3 font-mono text-zinc-500">{offer.supplierSku || '—'}</td>
                              <td className="p-3 font-mono font-bold text-zinc-900">
                                {filsToDisplay(offer.unitCost, 'ar')}
                              </td>
                              <td className="p-3 font-mono font-bold text-emerald-900">
                                {filsToDisplay(offer.variant.price, 'ar')}
                              </td>
                              <td className="p-3 text-center">
                                <div className="flex flex-col items-center gap-1">
                                  <span
                                    className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
                                      isVisibleInStore
                                        ? 'bg-emerald-100 text-emerald-900 border border-emerald-300'
                                        : 'bg-zinc-100 text-zinc-600 border border-zinc-200'
                                    }`}
                                  >
                                    {isVisibleInStore ? (
                                      <>
                                        <Eye className="w-3 h-3 text-emerald-700" />
                                        <span>ظاهر في المتجر</span>
                                      </>
                                    ) : (
                                      <>
                                        <EyeOff className="w-3 h-3 text-zinc-400" />
                                        <span>مخفي من المتجر</span>
                                      </>
                                    )}
                                  </span>
                                  <form action={toggleProductVisibilityFromSupplierAction.bind(null, offer.variant.productId, !isProductVisible)}>
                                    <button className="text-[10px] text-zinc-500 hover:text-zinc-900 underline font-medium">
                                      {isProductVisible ? 'إخفاء من المتجر' : 'إظهار في المتجر'}
                                    </button>
                                  </form>
                                </div>
                              </td>
                              <td className="p-3 font-mono text-zinc-600">
                                {(offer.supplierProfitShareBps / 100).toFixed(2)}%
                              </td>
                              <td className="p-3 text-center">
                                <form action={setSupplierOfferActive.bind(null, offer.id, !offer.isActive)}>
                                  <button
                                    className={`rounded-lg px-2.5 py-1 font-bold text-xs transition border ${
                                      offer.isActive
                                        ? 'bg-rose-50 border-rose-200 text-rose-700 hover:bg-rose-100'
                                        : 'bg-emerald-50 border-emerald-200 text-emerald-800 hover:bg-emerald-100'
                                    }`}
                                  >
                                    {offer.isActive ? 'تعطيل العرض' : 'تفعيل العرض'}
                                  </button>
                                </form>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <p className="p-4 text-xs text-zinc-400">لا توجد عروض مسجلة لهذا المحل.</p>
                )}
              </article>
            );
          })}
        </section>
      </main>
    </div>
  );
}

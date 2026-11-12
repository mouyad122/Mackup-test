'use client';

import React, { useState } from 'react';
import { filsToDisplay } from '@/lib/money';
import {
  Store,
  User,
  Phone,
  MapPin,
  ExternalLink,
  Printer,
  Share2,
  Copy,
  Check,
  Search,
  Eye,
  EyeOff,
  Sparkles,
  ShoppingBag,
  Image as ImageIcon,
  X,
} from 'lucide-react';

interface SupplierData {
  id: string;
  name: string;
  ownerName: string | null;
  phone: string | null;
  cleanPhone: string;
  email: string | null;
  address: string | null;
  mapUrl: string | null;
  profitMargin: number;
  isActive: boolean;
  totalSalesFils: number;
  obligationFils: number;
  paidFils: number;
  remainingBalanceFils: number;
}

export interface ProductData {
  productId: string;
  productNameAr: string;
  productNameEn?: string | null;
  sku: string;
  image: string | null;
  sizes: string[];
  sizesString: string;
  colors: string[];
  colorsString: string;
  fullDisplayName: string;
  minCostFils: number;
  maxCostFils: number;
  costDisplay: string;
  minPriceFils: number;
  maxPriceFils: number;
  priceDisplay: string;
  isProductVisible: boolean;
  isAnyOfferActive: boolean;
  isVisibleInStore: boolean;
  profitShareBps: number;
  profitShareDisplay: string;
  totalVariantsCount: number;
  offerIds: string[];
}

interface Props {
  supplier: SupplierData;
  products: ProductData[];
}

export default function SupplierProfileClient({ supplier, products }: Props) {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterVisibility, setFilterVisibility] = useState<'ALL' | 'VISIBLE' | 'HIDDEN'>('ALL');
  const [copiedLink, setCopiedLink] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);

  const filteredProducts = products.filter((p) => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) {
      if (filterVisibility === 'VISIBLE') return p.isVisibleInStore;
      if (filterVisibility === 'HIDDEN') return !p.isVisibleInStore;
      return true;
    }

    const matchesQuery =
      p.productNameAr.toLowerCase().includes(q) ||
      (p.productNameEn && p.productNameEn.toLowerCase().includes(q)) ||
      (p.fullDisplayName && p.fullDisplayName.toLowerCase().includes(q)) ||
      p.sku.toLowerCase().includes(q) ||
      p.sizesString.toLowerCase().includes(q) ||
      p.colorsString.toLowerCase().includes(q);

    if (!matchesQuery) return false;

    if (filterVisibility === 'VISIBLE') return p.isVisibleInStore;
    if (filterVisibility === 'HIDDEN') return !p.isVisibleInStore;
    return true;
  });

  const handleCopyLink = () => {
    if (typeof window !== 'undefined') {
      navigator.clipboard.writeText(window.location.href);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2000);
    }
  };

  const handlePrint = () => {
    if (typeof window !== 'undefined') {
      window.print();
    }
  };

  const shareText = encodeURIComponent(
    `مرحباً ${supplier.ownerName || supplier.name}،\nإليك رابط بيانات المحل والأصناف والأسعار المعتمدة على منصة رَواق:\n${typeof window !== 'undefined' ? window.location.href : ''}\n\nإجمالي الأصناف: ${products.length} صنف\nنسبة الربح: ${supplier.profitMargin}%`
  );

  return (
    <div className="min-h-screen bg-stone-50/70 text-zinc-900 font-sans pb-16" dir="rtl" lang="ar">
      {/* ── Print Styles ── */}
      <style dangerouslySetInnerHTML={{ __html: `
        @media print {
          @page {
            size: A4 portrait;
            margin: 10mm !important;
          }
          .no-print {
            display: none !important;
          }
          body, html {
            background-color: #ffffff !important;
            color: #09090b !important;
          }
          .print-border-none {
            border: none !important;
            box-shadow: none !important;
          }
        }
      `}} />

      {/* ── Top Header / Brand Bar ── */}
      <header className="bg-white border-b border-zinc-200 sticky top-0 z-30 shadow-2xs no-print">
        <div className="max-w-6xl mx-auto px-4 py-3 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-950 text-amber-300 flex items-center justify-center font-bold text-lg shadow-xs">
              ر
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-sm font-black text-emerald-950">رَواق للتجارة الإلكترونية</h1>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-900 font-mono">
                  PARTNER STORE PROFILE
                </span>
              </div>
              <p className="text-[11px] text-zinc-500">كشف بيانات المحل الشريك، الأصناف، أسعار التكلفة وسعر البيع</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="inline-flex items-center gap-1.5 rounded-xl border border-zinc-300 bg-white px-3.5 py-1.5 text-xs font-bold text-zinc-700 hover:bg-zinc-50 transition shadow-2xs"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>طباعة الكشف (A4)</span>
            </button>

            <button
              onClick={handleCopyLink}
              className="inline-flex items-center gap-1.5 rounded-xl border border-emerald-300 bg-emerald-50 px-3.5 py-1.5 text-xs font-bold text-emerald-900 hover:bg-emerald-100 transition shadow-2xs"
            >
              {copiedLink ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copiedLink ? 'تم نسخ الرابط' : 'نسخ الرابط للمحل'}</span>
            </button>

            {supplier.phone && (
              <a
                href={`https://wa.me/${supplier.cleanPhone}?text=${shareText}`}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 rounded-xl bg-[#25D366] hover:bg-[#1EBE5D] text-white px-4 py-1.5 text-xs font-bold transition shadow-xs"
              >
                <Share2 className="w-3.5 h-3.5" />
                <span>إرسال للمحل عبر واتساب</span>
              </a>
            )}
          </div>
        </div>
      </header>

      {/* ── Main Container ── */}
      <main className="max-w-6xl mx-auto px-4 py-6 space-y-6">
        {/* ── Store Info Hero Card ── */}
        <section className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm space-y-5 print-border-none">
          <div className="flex flex-wrap items-start justify-between gap-4 border-b border-zinc-100 pb-5">
            <div className="space-y-2">
              <div className="flex flex-wrap items-center gap-2.5">
                <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-900 border border-amber-200 flex items-center justify-center">
                  <Store className="w-6 h-6" />
                </div>
                <div>
                  <h2 className="text-xl font-black text-zinc-900">{supplier.name}</h2>
                  <div className="flex flex-wrap items-center gap-2 text-xs text-zinc-500 mt-0.5">
                    {supplier.ownerName && (
                      <span className="flex items-center gap-1 bg-zinc-100 px-2.5 py-0.5 rounded-full text-zinc-700 font-semibold">
                        <User className="w-3 h-3 text-zinc-400" />
                        <span>المسؤول: {supplier.ownerName}</span>
                      </span>
                    )}
                    <span className="bg-emerald-50 text-emerald-900 border border-emerald-200 px-2.5 py-0.5 rounded-full font-bold">
                      حصة المحل من الأرباح: {supplier.profitMargin}%
                    </span>
                    <span className={`px-2 py-0.5 rounded-full font-bold text-[11px] ${supplier.isActive ? 'bg-green-100 text-green-800' : 'bg-zinc-100 text-zinc-600'}`}>
                      {supplier.isActive ? 'محل نشط معتمد' : 'محل غير مفعل'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Contact and Location */}
              <div className="flex flex-wrap items-center gap-4 text-xs text-zinc-600 pt-2">
                {supplier.phone && (
                  <div className="flex items-center gap-1.5 font-mono">
                    <Phone className="w-3.5 h-3.5 text-zinc-400" />
                    <span dir="ltr">{supplier.phone}</span>
                  </div>
                )}
                {supplier.address && (
                  <div className="flex items-center gap-1.5 text-zinc-600">
                    <MapPin className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
                    <span>{supplier.address}</span>
                  </div>
                )}
                {supplier.mapUrl && (
                  <a
                    href={supplier.mapUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center gap-1 font-bold text-blue-700 hover:underline"
                  >
                    <ExternalLink className="w-3 h-3" />
                    <span>موقع المحل على الخريطة</span>
                  </a>
                )}
              </div>
            </div>

            {/* Financial Status Summary Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
              <div className="rounded-xl border border-zinc-200 bg-zinc-50/70 p-3 text-right">
                <span className="text-[10px] font-bold text-zinc-500 block">إجمالي المبيعات</span>
                <strong className="text-sm font-black text-zinc-900 font-mono block mt-0.5">
                  {filsToDisplay(supplier.totalSalesFils)} د.أ
                </strong>
              </div>
              <div className="rounded-xl border border-zinc-200 bg-zinc-50/70 p-3 text-right">
                <span className="text-[10px] font-bold text-zinc-500 block">المستحق المحاسبي</span>
                <strong className="text-sm font-black text-zinc-900 font-mono block mt-0.5">
                  {filsToDisplay(supplier.obligationFils)} د.أ
                </strong>
              </div>
              <div className="rounded-xl border border-zinc-200 bg-zinc-50/70 p-3 text-right">
                <span className="text-[10px] font-bold text-zinc-500 block">إجمالي المسدد</span>
                <strong className="text-sm font-black text-emerald-800 font-mono block mt-0.5">
                  {filsToDisplay(supplier.paidFils)} د.أ
                </strong>
              </div>
              <div className="rounded-xl border border-amber-300 bg-amber-50/60 p-3 text-right">
                <span className="text-[10px] font-bold text-amber-900 block">الرصيد المتبقي</span>
                <strong className="text-sm font-black text-amber-950 font-mono block mt-0.5">
                  {filsToDisplay(supplier.remainingBalanceFils)} د.أ
                </strong>
              </div>
            </div>
          </div>

          {/* ── Search & Filter Controls ── */}
          <div className="flex flex-wrap items-center justify-between gap-3 pt-1 no-print">
            <div className="relative flex-1 min-w-[240px] max-w-md">
              <Search className="w-4 h-4 text-zinc-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                placeholder="بحث باسم المنتج، المقاس، أو اللون..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full rounded-xl border border-zinc-200 pr-9 pl-3 py-2 text-xs focus:ring-1 focus:ring-emerald-800 focus:outline-none"
              />
            </div>

            <div className="flex items-center gap-1.5 bg-zinc-100 p-1 rounded-xl text-xs font-bold text-zinc-600">
              <button
                onClick={() => setFilterVisibility('ALL')}
                className={`px-3 py-1.5 rounded-lg transition ${
                  filterVisibility === 'ALL'
                    ? 'bg-white text-emerald-950 shadow-2xs font-extrabold'
                    : 'hover:text-zinc-900'
                }`}
              >
                كافة الأصناف ({products.length})
              </button>
              <button
                onClick={() => setFilterVisibility('VISIBLE')}
                className={`px-3 py-1.5 rounded-lg transition ${
                  filterVisibility === 'VISIBLE'
                    ? 'bg-emerald-900 text-white shadow-2xs font-extrabold'
                    : 'hover:text-zinc-900'
                }`}
              >
                👁️ ظاهر في المتجر ({products.filter((p) => p.isVisibleInStore).length})
              </button>
              <button
                onClick={() => setFilterVisibility('HIDDEN')}
                className={`px-3 py-1.5 rounded-lg transition ${
                  filterVisibility === 'HIDDEN'
                    ? 'bg-zinc-800 text-white shadow-2xs font-extrabold'
                    : 'hover:text-zinc-900'
                }`}
              >
                🔒 مخفي من المتجر ({products.filter((p) => !p.isVisibleInStore).length})
              </button>
            </div>
          </div>
        </section>

        {/* ── Products Table ── */}
        <section className="rounded-2xl border border-zinc-200 bg-white overflow-hidden shadow-sm print-border-none">
          <div className="p-4 border-b border-zinc-100 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ShoppingBag className="w-4 h-4 text-emerald-900" />
              <h3 className="text-sm font-black text-zinc-900">
                سجل منتجات وأصناف المحل ({filteredProducts.length} صنف)
              </h3>
            </div>
            <span className="text-xs text-zinc-500 font-mono">
              أسعار التكلفة وسعر البيع وحالة العرض في المتجر
            </span>
          </div>

          {filteredProducts.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-right text-xs">
                <thead className="bg-zinc-50 text-zinc-600 font-bold border-b border-zinc-200">
                  <tr>
                    <th className="py-3 px-3 text-center w-12">#</th>
                    <th className="py-3 px-3 text-center w-20">صورة المنتج</th>
                    <th className="py-3 px-4">اسم الصنف والمنتج والمواصفات (المقاسات والألوان)</th>
                    <th className="py-3 px-3">سعر التكلفة للمحل</th>
                    <th className="py-3 px-3">سعر البيع في المتجر</th>
                    <th className="py-3 px-3 text-center">حالة الصنف في المتجر</th>
                    <th className="py-3 px-3 text-center">حصة المحل %</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100">
                  {filteredProducts.map((prod, idx) => (
                    <tr key={prod.productId} className="hover:bg-zinc-50/60 transition">
                      <td className="py-3 px-3 text-center font-mono text-zinc-400 text-[11px]">{idx + 1}</td>
                      <td className="py-2.5 px-3 text-center">
                        {prod.image ? (
                          <div
                            onClick={() => setSelectedImage(prod.image)}
                            className="w-12 h-12 rounded-xl border border-zinc-200 bg-white p-0.5 mx-auto cursor-pointer overflow-hidden shadow-2xs hover:scale-105 transition"
                            title="اضغط لتكبير الصورة"
                          >
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                              src={prod.image}
                              alt={prod.productNameAr}
                              className="w-full h-full object-cover rounded-lg"
                            />
                          </div>
                        ) : (
                          <div className="w-12 h-12 rounded-xl border border-dashed border-zinc-300 bg-zinc-50 flex items-center justify-center mx-auto text-zinc-400">
                            <ImageIcon className="w-5 h-5" />
                          </div>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <strong className="font-extrabold text-zinc-900 text-xs">
                            {prod.productNameAr}
                          </strong>
                          {prod.sizesString && (
                            <span className="inline-flex items-center gap-1 font-bold text-emerald-950 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded text-[11px] whitespace-nowrap">
                              المقاسات: {prod.sizesString}
                            </span>
                          )}
                          {prod.colorsString && (
                            <span className="inline-flex items-center gap-1 font-bold text-stone-800 bg-stone-100 border border-stone-200 px-2 py-0.5 rounded text-[11px] whitespace-nowrap">
                              الألوان: {prod.colorsString}
                            </span>
                          )}
                        </div>
                        {prod.productNameEn && (
                          <span className="text-[10px] text-zinc-400 block font-normal mt-0.5">
                            {prod.productNameEn}
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-3 font-mono font-bold text-zinc-900">
                        {prod.costDisplay}
                      </td>
                      <td className="py-3 px-3 font-mono font-bold text-emerald-900">
                        {prod.priceDisplay}
                      </td>
                      <td className="py-3 px-3 text-center">
                        {prod.isVisibleInStore ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 text-emerald-900 border border-emerald-300 px-2.5 py-0.5 text-[11px] font-bold">
                            <Eye className="w-3 h-3 text-emerald-700" />
                            <span>ظاهر في المتجر</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 rounded-full bg-zinc-100 text-zinc-600 border border-zinc-300 px-2.5 py-0.5 text-[11px] font-bold">
                            <EyeOff className="w-3 h-3 text-zinc-400" />
                            <span>مخفي من المتجر</span>
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-3 text-center font-mono font-semibold text-zinc-700">
                        {prod.profitShareDisplay}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="p-10 text-center text-zinc-400 text-xs">
              لا توجد أصناف تطابق معايير البحث المحددة.
            </div>
          )}
        </section>

        {/* ── Official Footer Stamp ── */}
        <footer className="pt-6 border-t border-zinc-200 flex flex-wrap items-center justify-between text-xs text-zinc-500 gap-4">
          <div className="space-y-0.5">
            <strong className="text-zinc-800 font-bold block">منظومة رَواق للتجارة الإلكترونية والتسويات</strong>
            <span>المملكة الأردنية الهاشمية · عمان</span>
          </div>
          <div className="text-[11px] text-zinc-400 font-mono">
            تم استخراج البيانات آلياً من سجل المحلات المعتمد · {new Date().toLocaleDateString('ar-JO')}
          </div>
        </footer>
      </main>

      {/* ── Image Lightbox Modal ── */}
      {selectedImage && (
        <div
          onClick={() => setSelectedImage(null)}
          className="fixed inset-0 z-50 bg-black/75 flex items-center justify-center p-4 backdrop-blur-xs no-print"
        >
          <div className="relative max-w-lg w-full bg-white rounded-2xl overflow-hidden p-3 shadow-2xl">
            <button
              onClick={() => setSelectedImage(null)}
              className="absolute top-4 left-4 w-8 h-8 rounded-full bg-zinc-900/70 text-white flex items-center justify-center hover:bg-black transition z-10"
            >
              <X className="w-4 h-4" />
            </button>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={selectedImage}
              alt="معاينة المنتج"
              className="w-full h-auto max-h-[80vh] object-contain rounded-xl"
            />
          </div>
        </div>
      )}
    </div>
  );
}

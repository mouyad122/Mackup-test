'use client';

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import { filsToDisplay } from '@/lib/money';
import { GlobalPricingModal } from '@/components/GlobalPricingModal';

export function AdminProductsClient({ products, globalPrices, adminId, categories, lowStockThreshold = 5 }: { products: any[], globalPrices: any, adminId: string, categories: any[], lowStockThreshold?: number }) {
  const [search, setSearch] = useState('');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  // Filter products by search
  const filteredProducts = useMemo(() => {
    if (!search.trim()) return products;
    const lowerSearch = search.toLowerCase();
    return products.filter(p => 
      p.nameAr.toLowerCase().includes(lowerSearch) || 
      (p.nameEn && p.nameEn.toLowerCase().includes(lowerSearch)) ||
      (p.sku && p.sku.toLowerCase().includes(lowerSearch))
    );
  }, [products, search]);

  const toggleSelectAll = () => {
    if (selectedIds.length === filteredProducts.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filteredProducts.map(p => p.id));
    }
  };

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => 
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  return (
    <div className="w-full flex flex-col gap-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-[var(--color-ivory-200)] pb-4">
        <div>
          <h1 className="text-3xl font-bold font-heading text-[var(--color-charcoal-900)]">
            إدارة المنتجات والأسعار
          </h1>
          <p className="text-zinc-500 mt-1 text-sm">التحكم بكافة المكياج، الأحجام، والأسعار • {products.length} منتج</p>
        </div>
        <div className="flex flex-col sm:flex-row gap-2 w-full md:w-auto">
          <input 
            type="text" 
            placeholder="بحث بالاسم أو الكود (SKU)..." 
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="border border-zinc-300 rounded px-4 py-2.5 text-sm focus:outline-none focus:border-[var(--color-champagne-600)] w-full sm:w-64"
          />
          <GlobalPricingModal 
            initialPrices={globalPrices} 
            adminId={adminId} 
            categories={categories}
            selectedProductIds={selectedIds}
            onClearSelection={() => setSelectedIds([])}
          />
          <Link
            href="/admin/products/new"
            className="bg-[var(--color-charcoal-900)] hover:bg-[var(--color-charcoal-800)] text-white px-6 py-2.5 rounded font-bold transition-colors text-sm shadow-sm whitespace-nowrap text-center"
          >
            + إضافة مكياج جديد
          </Link>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-[var(--color-ivory-200)] overflow-x-auto">
        <div className="overflow-x-auto w-full max-w-[90vw] md:max-w-full pb-4">
          <table className="w-full text-right border-collapse min-w-[800px]">
            <thead className="bg-zinc-50 border-b border-zinc-200">
              <tr className="text-sm font-bold text-zinc-700">
                <th className="px-4 py-4 w-12 text-center">
                  <input 
                    type="checkbox" 
                    checked={filteredProducts.length > 0 && selectedIds.length === filteredProducts.length}
                    onChange={toggleSelectAll}
                    className="w-4 h-4 text-[var(--color-champagne-600)] rounded border-zinc-300 focus:ring-[var(--color-champagne-600)]"
                  />
                </th>
                <th className="px-4 py-4 w-14">صورة</th>
                <th className="px-4 py-4">اسم العطر</th>
                <th className="px-4 py-4">SKU</th>
                <th className="px-4 py-4">التصنيف</th>
                <th className="px-4 py-4">الأحجام والأسعار</th>
                <th className="px-4 py-4">المخزون</th>
                <th className="px-4 py-4">الحالة</th>
                <th className="px-4 py-4 text-center">إجراءات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {filteredProducts.map((product) => {
                const mainImage = product.images?.[0];
                const isSelected = selectedIds.includes(product.id);
                const totalStock = product.variants.reduce((acc: number, v: any) => acc + (v.stock || 0), 0);
                
                return (
                  <tr key={product.id} className={`hover:bg-zinc-50/50 transition-colors text-zinc-700 ${isSelected ? 'bg-blue-50/30' : ''}`}>
                    <td className="px-4 py-3 text-center">
                      <input 
                        type="checkbox" 
                        checked={isSelected}
                        onChange={() => toggleSelect(product.id)}
                        className="w-4 h-4 text-[var(--color-champagne-600)] rounded border-zinc-300 focus:ring-[var(--color-champagne-600)]"
                      />
                    </td>
                    <td className="px-4 py-3">
                      <div className="w-12 h-12 rounded-lg border bg-zinc-50 overflow-hidden flex items-center justify-center">
                        {mainImage ? (
                          <img src={mainImage.url.startsWith('local://') ? mainImage.url.replace('local://', '/') : mainImage.url} alt={product.nameAr} className="w-full h-full object-contain" />
                        ) : (
                          <span className="text-[10px] text-zinc-400">بدون صورة</span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-bold text-zinc-900">{product.nameAr}</div>
                      <div className="text-xs text-zinc-400 font-normal">{product.nameEn}</div>
                    </td>
                    <td className="px-4 py-3 text-sm font-mono text-zinc-600">{product.sku}</td>
                    <td className="px-4 py-3 text-sm">{product.category?.name}</td>
                    <td className="px-4 py-3 text-sm">
                      <div className="flex flex-wrap gap-1">
                        {product.variants.map((v: any) => (
                          <span key={v.id} className="bg-[var(--color-ivory-200)] px-2 py-0.5 rounded text-xs font-bold text-[var(--color-charcoal-800)]">
                            {v.name}: {filsToDisplay(v.price, 'ar')}
                          </span>
                        ))}
                        {product.variants.length === 0 && <span className="text-xs text-zinc-400">لا توجد خيارات</span>}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm">
                      <div className="flex flex-col gap-1">
                        {product.variants.map((v: any) => (
                          <div key={v.id} className="flex items-center gap-2 justify-between">
                            <span className="text-xs text-zinc-500 shrink-0">{v.name}:</span>
                            <span className={`inline-block px-2 py-0.5 rounded text-xs font-bold ${
                              v.stock === 0
                                ? 'bg-red-100 text-red-800'
                                : v.stock <= lowStockThreshold
                                  ? 'bg-amber-100 text-amber-800'
                                  : 'bg-emerald-100 text-emerald-800'
                            }`}>
                              {v.stock} قطع
                            </span>
                          </div>
                        ))}
                        {product.variants.length === 0 && (
                          <span className="text-xs text-zinc-400">—</span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex px-2 py-0.5 rounded text-xs font-bold ${product.isVisible ? 'bg-green-100 text-green-800' : 'bg-zinc-100 text-zinc-600'}`}>
                        {product.isVisible ? 'نشط' : 'مخفي'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center text-sm font-bold">
                      <Link
                        href={`/admin/products/${product.id}`}
                        className="text-[var(--color-champagne-600)] hover:text-[var(--color-champagne-700)] hover:underline"
                      >
                        تعديل
                      </Link>
                    </td>
                  </tr>
                );
              })}

              {filteredProducts.length === 0 && (
                <tr>
                  <td colSpan={9} className="px-6 py-16 text-center">
                    <p className="text-zinc-500 mb-4">لا توجد منتجات تطابق البحث.</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

'use client';

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import { filsToDisplay } from '@/lib/money';

export function AdminProductsClient({
  products,
  adminId,
  categories,
  lowStockThreshold = 5,
}: {
  products: any[];
  adminId: string;
  categories: any[];
  lowStockThreshold?: number;
}) {
  const [search, setSearch] = useState('');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  // Filter products by search (name & category)
  const filteredProducts = useMemo(() => {
    if (!search.trim()) return products;
    const lowerSearch = search.toLowerCase();
    return products.filter(
      p =>
        p.nameAr.toLowerCase().includes(lowerSearch) ||
        (p.nameEn && p.nameEn.toLowerCase().includes(lowerSearch)) ||
        (p.category?.name && p.category.name.toLowerCase().includes(lowerSearch))
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
    setSelectedIds(prev => (prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]));
  };

  return (
    <div className="w-full flex flex-col gap-6 font-sans">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-[var(--color-ivory-200)] pb-4">
        <div>
          <h1 className="text-3xl font-bold font-heading text-[#3F4832]">
            إدارة المنتجات والأسعار
          </h1>
          <p className="text-zinc-500 mt-1 text-sm">
            التحكم بكافة المنتجات، الخيارات، والأسعار • {products.length} منتج
          </p>
        </div>
        <div className="flex flex-col sm:flex-row gap-2 w-full md:w-auto">
          <input
            type="text"
            placeholder="بحث بالاسم أو التصنيف..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="border border-zinc-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-[#3F4832] w-full sm:w-64"
          />

          <Link
            href="/admin/products/new"
            className="bg-[#3F4832] hover:bg-[#2d3623] text-white px-6 py-2.5 rounded-lg font-bold transition-colors text-sm shadow-sm whitespace-nowrap text-center"
          >
            + إضافة منتج جديد
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
                    className="w-4 h-4 text-[#3F4832] rounded border-zinc-300 focus:ring-[#3F4832]"
                  />
                </th>
                <th className="px-4 py-4 w-14">صورة</th>
                <th className="px-4 py-4">اسم المنتج</th>
                <th className="px-4 py-4">التصنيف</th>
                <th className="px-4 py-4">الخيارات والأسعار</th>
                <th className="px-4 py-4">الحالة</th>
                <th className="px-4 py-4 text-center">إجراءات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {filteredProducts.map(product => {
                const mainImage = product.images?.[0];
                const isSelected = selectedIds.includes(product.id);

                return (
                  <tr
                    key={product.id}
                    className={`hover:bg-zinc-50/50 transition-colors text-zinc-700 ${
                      isSelected ? 'bg-blue-50/30' : ''
                    }`}
                  >
                    <td className="px-4 py-3 text-center">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => toggleSelect(product.id)}
                        className="w-4 h-4 text-[#3F4832] rounded border-zinc-300 focus:ring-[#3F4832]"
                      />
                    </td>
                    <td className="px-4 py-3">
                      <div className="w-12 h-12 rounded-lg border bg-zinc-50 overflow-hidden flex items-center justify-center">
                        {mainImage ? (
                          <img
                            src={
                              mainImage.url.startsWith('local://')
                                ? mainImage.url.replace('local://', '/')
                                : mainImage.url
                            }
                            alt={product.nameAr}
                            className="w-full h-full object-contain"
                          />
                        ) : (
                          <span className="text-[10px] text-zinc-400">بدون صورة</span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-bold text-zinc-900">{product.nameAr}</div>
                      <div className="text-xs text-zinc-400 font-normal">{product.nameEn}</div>
                    </td>
                    <td className="px-4 py-3 text-sm font-medium">{product.category?.name}</td>
                    <td className="px-4 py-3 text-sm">
                      <div className="flex flex-wrap gap-1">
                        {product.variants.map((v: any) => (
                          <span
                            key={v.id}
                            className="bg-[var(--color-ivory-200)] px-2 py-0.5 rounded text-xs font-bold text-[#2d3623]"
                          >
                            {v.size || v.name}: {filsToDisplay(v.price, 'ar')}
                          </span>
                        ))}
                        {product.variants.length === 0 && (
                          <span className="text-xs text-zinc-400">لا توجد خيارات</span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex px-2 py-0.5 rounded text-xs font-bold ${
                          product.isVisible ? 'bg-green-100 text-green-800' : 'bg-zinc-100 text-zinc-600'
                        }`}
                      >
                        {product.isVisible ? 'نشط' : 'مخفي'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center text-sm font-bold">
                      <Link
                        href={`/admin/products/${product.id}`}
                        className="text-[#3F4832] hover:underline"
                      >
                        تعديل
                      </Link>
                    </td>
                  </tr>
                );
              })}

              {filteredProducts.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-6 py-16 text-center">
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

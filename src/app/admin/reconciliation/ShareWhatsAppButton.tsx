'use client';

import React from 'react';
import { filsToDisplay } from '@/lib/money';

export function ShareWhatsAppButton({ reportData }: { reportData: any }) {
  const handleShare = () => {
    const text = `*تقرير الجرد الشامل* 📊
تاريخ التقرير: ${new Date().toLocaleString('en-GB')}

*الإيرادات:*
مبيعات المنتجات: ${filsToDisplay(reportData.productSales)}
رسوم التوصيل: ${filsToDisplay(reportData.deliveryRevenue)}
إجمالي الإيرادات: ${filsToDisplay(reportData.totalRevenue)}

*التكاليف والمصروفات:*
تكلفة المنتجات: ${filsToDisplay(reportData.productCost)}
أرباح الموردين: ${filsToDisplay(reportData.supplierProfitShare)}
تكلفة التوصيل: ${filsToDisplay(reportData.actualDeliveryCost)}
أرباح المندوبين: ${filsToDisplay(reportData.captainEarnings)}
خصومات: ${filsToDisplay(reportData.discounts)}
مصروفات: ${filsToDisplay(reportData.expenses)}

*صافي الربح:* ${filsToDisplay(reportData.netProfit)}

*المستحقات:*
الموردين: ${reportData.supplierBalances.length > 0 ? reportData.supplierBalances.map((b:any) => `\n- ${b.supplier.name}: ${filsToDisplay(b.owed)}`).join('') : 'لا يوجد'}
المندوبين: ${reportData.captainBalances.length > 0 ? reportData.captainBalances.map((b:any) => `\n- ${b.captain.name}: ${filsToDisplay(b.owed)}`).join('') : 'لا يوجد'}`;

    const url = `https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`;
    window.open(url, '_blank');
  };

  return (
    <button 
      onClick={handleShare}
      className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded shadow flex items-center gap-2 print:hidden"
    >
      <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/></svg>
      مشاركة واتساب
    </button>
  );
}

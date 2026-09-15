import React from 'react';
import { prisma } from '@/lib/db';
import { filsToDisplay } from '@/lib/money';
import { getCMSContent } from '@/lib/cms';

export default async function ShippingPage({ params }: { params: Promise<{ locale: string }> }) {
  const resolvedParams = await params;
  const locale = resolvedParams.locale;
  const isAr = locale === 'ar';

  const defaultIntro = {
    titleAr: 'سياسة الشحن والتوصيل',
    titleEn: 'Shipping & Delivery Policy',
    introAr: 'نحن نوفر خدمة توصيل سريعة وموثوقة لجميع المحافظات الأردنية. فيما يلي تفاصيل رسوم ومواعيد الشحن حسب المنطقة:',
    introEn: 'We offer fast and reliable delivery across all Jordan governorates. Here are the details of shipping fees and estimated times:'
  };

  const cms = await getCMSContent('shipping_policy', defaultIntro);

  const zones = await prisma.shippingZone.findMany({
    where: { isEnabled: true }
  });

  return (
    <div className="container mx-auto px-6 py-16">
      <div className="max-w-3xl mx-auto bg-white border border-[var(--color-ivory-200)] rounded-lg p-10 shadow-sm">
        <h1 className="text-4xl font-bold font-heading text-[var(--color-charcoal-900)] mb-8 border-b pb-4">
          {isAr ? cms.titleAr : cms.titleEn}
        </h1>
        
        <p className="text-zinc-700 leading-relaxed mb-8 whitespace-pre-line">
          {isAr ? cms.introAr : cms.introEn}
        </p>

        <div className="space-y-6">
          <h2 className="text-2xl font-bold text-[var(--color-charcoal-900)] mb-4">
            {isAr ? 'مناطق التوصيل' : 'Delivery Zones'}
          </h2>
          
          <div className="overflow-x-auto">
            <table className="w-full text-right border-collapse">
              <thead>
                <tr className="border-b border-zinc-200 text-sm font-bold text-zinc-700">
                  <th className="py-3 px-4">{isAr ? 'المنطقة' : 'Zone'}</th>
                  <th className="py-3 px-4">{isAr ? 'رسوم التوصيل' : 'Shipping Fee'}</th>
                  <th className="py-3 px-4">{isAr ? 'مدة التوصيل التقريبية' : 'Est. Delivery Time'}</th>
                  <th className="py-3 px-4">{isAr ? 'توصيل مجاني للطلبات فوق' : 'Free Shipping From'}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {zones.map((zone) => (
                  <tr key={zone.id} className="text-zinc-650">
                    <td className="py-3 px-4 font-bold">{isAr ? zone.nameAr : zone.nameEn}</td>
                    <td className="py-3 px-4">{filsToDisplay(zone.fee, isAr ? 'ar' : 'en')}</td>
                    <td className="py-3 px-4">{zone.estimatedDeliveryTime}</td>
                    <td className="py-3 px-4">
                      {zone.freeShippingThreshold 
                        ? filsToDisplay(zone.freeShippingThreshold, isAr ? 'ar' : 'en')
                        : (isAr ? 'غير متوفر' : 'N/A')}
                    </td>
                  </tr>
                ))}
                
                {zones.length === 0 && (
                  <tr>
                    <td colSpan={4} className="py-8 text-center text-zinc-500">
                      {isAr ? 'سيتم تحديد رسوم التوصيل عند الاتصال بالواتساب.' : 'Shipping fees will be calculated at checkout.'}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

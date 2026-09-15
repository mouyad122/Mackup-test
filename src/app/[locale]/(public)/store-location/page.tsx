import React from 'react';
import { getCMSContent } from '@/lib/cms';

export default async function StoreLocationPage({ params }: { params: Promise<{ locale: string }> }) {
  const resolvedParams = await params;
  const locale = resolvedParams.locale;
  const isAr = locale === 'ar';

  const locationInfo = await getCMSContent('store_location_info', {
    addressAr: 'عمان، الأردن - شارع مكة',
    addressEn: 'Amman, Jordan - Mecca St',
    hoursAr: '10:00 ص - 10:00 م',
    hoursEn: '10:00 AM - 10:00 PM',
    phone: '+962785050655'
  });

  return (
    <div className="container mx-auto px-6 py-16">
      <div className="max-w-3xl mx-auto bg-white border border-[var(--color-ivory-200)] rounded-lg p-10 shadow-sm">
        <h1 className="text-4xl font-bold font-heading text-[var(--color-charcoal-900)] mb-8 border-b pb-4">
          {isAr ? 'موقع المعرض' : 'Our Store Location'}
        </h1>
        
        <div className="space-y-6 text-zinc-700">
          <p className="text-lg">
            <strong>{isAr ? 'العنوان المعتمد للفرع الرئيسي:' : 'Main Branch Location:'}</strong> <br />
            {isAr ? locationInfo.addressAr : locationInfo.addressEn}
          </p>
          
          <p className="text-lg">
            <strong>{isAr ? 'أوقات الدوام الرسمي لاستقبال الزوار:' : 'Official Showroom Hours:'}</strong> <br />
            {isAr ? locationInfo.hoursAr : locationInfo.hoursEn}
          </p>
          
          {/* Simulated Premium Map Component */}
          <div className="w-full h-80 bg-[var(--color-ivory-200)] rounded-lg border border-[var(--color-ivory-200)] flex items-center justify-center text-center p-6 text-[var(--color-charcoal-900)] overflow-hidden relative shadow-inner">
            <div className="absolute inset-0 bg-[radial-gradient(#C9A06A_1px,transparent_1px)] [background-size:16px_16px] opacity-25" />
            <div className="relative z-10">
              <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mx-auto mb-4 text-[var(--color-champagne-600)]"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg>
              <h3 className="font-bold text-lg mb-1">{isAr ? 'خريطة تفاعلية تقريبية' : 'Interactive Location Preview'}</h3>
              <p className="text-sm text-zinc-500 max-w-md mx-auto">
                {isAr ? 'معرض ميكاب ديمو - شارع مكة. تفضل بزيارتنا لتجربة أحدث تشكيلاتنا العطرية مباشرة.' : 'Makeup Demo Showroom - Mecca St. Visit us to experience our fragrance collection.'}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

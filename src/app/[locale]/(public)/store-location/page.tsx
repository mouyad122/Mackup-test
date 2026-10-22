import React from 'react';
import { getCMSContent } from '@/lib/cms';

export default async function StoreLocationPage({ params }: { params: Promise<{ locale: string }> }) {
  const resolvedParams = await params;
  const locale = resolvedParams.locale;
  const isAr = locale === 'ar';

  const locationInfo = await getCMSContent('store_location_info', {
    addressAr: '',
    addressEn: '',
    hoursAr: '',
    hoursEn: '',
  });

  return (
    <div className="container mx-auto px-6 py-16">
      <div className="max-w-3xl mx-auto bg-white border border-[var(--color-ivory-200)] rounded-lg p-10 shadow-sm">
        <h1 className="text-4xl font-bold font-heading text-[#3F4832] mb-8 border-b pb-4">
          {isAr ? 'موقع المعرض' : 'Our Store Location'}
        </h1>
        
        <div className="space-y-6 text-zinc-700">
          <p className="text-lg">
            <strong>{isAr ? 'العنوان:' : 'Address:'}</strong> <br />
            {(isAr ? locationInfo.addressAr : locationInfo.addressEn) || (isAr ? 'لم تتم إضافة عنوان للمتجر بعد.' : 'A store address has not been added yet.')}
          </p>
          
          <p className="text-lg">
            <strong>{isAr ? 'أوقات العمل:' : 'Working hours:'}</strong> <br />
            {(isAr ? locationInfo.hoursAr : locationInfo.hoursEn) || (isAr ? 'لم تتم إضافة أوقات العمل بعد.' : 'Working hours have not been added yet.')}
          </p>

        </div>
      </div>
    </div>
  );
}

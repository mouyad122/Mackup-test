'use client';

import React, { useState } from 'react';
import { useParams } from 'next/navigation';
import { AlertTriangle, MapPin, Clock, Phone, Map, MessageCircle } from 'lucide-react';

export interface StoreLocationSettings {
  id: string;
  storeName: string;
  addressAr: string;
  addressEn: string;
  latitude: number;
  longitude: number;
  mapPlaceUrl: string;
  mapEmbedUrl: string;
  phone: string;
  whatsapp: string;
  openingHours: string;
  locationSectionEnabled: boolean;
  directionsButtonEnabled: boolean;
  mapZoom: number;
  mapLabelAr: string | null;
  mapLabelEn: string | null;
}

interface StoreLocationSectionProps {
  settings: StoreLocationSettings;
}

export function StoreLocationSection({ settings }: StoreLocationSectionProps) {
  const { locale = 'ar' } = useParams() as { locale?: string };
  const isAr = locale === 'ar';
  const [loadMap, setLoadMap] = useState(true);

  if (!settings.locationSectionEnabled) {
    return null;
  }

  // Graceful configuration error validations
  const isConfigValid = 
    settings.addressAr && 
    settings.addressEn && 
    settings.mapPlaceUrl && 
    settings.mapEmbedUrl && 
    settings.phone && 
    settings.whatsapp;

  if (!isConfigValid) {
    return (
      <section className="py-12 bg-[var(--color-ivory-100)] border-t border-[var(--color-ivory-200)] text-center text-xs text-red-650 flex items-center justify-center gap-2" dir="rtl">
        <AlertTriangle className="w-4 h-4 text-red-600" /> تنبيه إداري: بعض إعدادات موقع المتجر أو روابط الخرائط غير مكتملة في لوحة التحكم. يرجى مراجعتها وتعبئة كافة البيانات المطلوبة.
      </section>
    );
  }

  const handleDirectionsClick = () => {
    window.open(settings.mapPlaceUrl, '_blank', 'noopener,noreferrer');
  };

  const handlePhoneClick = () => {
    window.location.href = `tel:${settings.phone.replace(/\s+/g, '')}`;
  };

  const handleWhatsAppClick = () => {
    // Format whatsapp number safely
    const cleanNumber = settings.whatsapp.replace(/[^0-9]/g, '');
    window.open(`https://wa.me/${cleanNumber}`, '_blank', 'noopener,noreferrer');
  };

  return (
    <section className="py-20 bg-[var(--color-ivory-100)] border-t border-[var(--color-ivory-200)] relative" id="store-location" dir={isAr ? 'rtl' : 'ltr'}>
      <div className="container mx-auto px-6 max-w-6xl space-y-12">
        
        {/* Section Header */}
        <div className="text-center space-y-3">
          <span className="text-[10px] tracking-widest font-bold text-[var(--color-champagne-600)] uppercase block">
            {isAr ? 'موقعنا الرسمي' : 'Our Showroom'}
          </span>
          <h2 className="text-2xl md:text-3xl font-bold font-heading text-[var(--color-charcoal-900)]">
            {isAr ? 'تفضل بزيارة معرض ميكاب ديمو' : 'Visit Makeup Demo Store'}
          </h2>
          <div className="w-16 h-1 bg-[var(--color-champagne-600)] mx-auto rounded-full" />
        </div>

        {/* Responsive Grid layout */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 items-stretch">
          
          {/* Details Card Column */}
          <div className="bg-white rounded-lg border border-[var(--color-ivory-200)] shadow-sm p-6 md:p-10 flex flex-col justify-between space-y-6">
            <div className="space-y-6">
              {/* Store Title */}
              <div>
                <h3 className="text-xl font-bold text-[var(--color-charcoal-900)]">
                  {settings.storeName}
                </h3>
                <p className="text-xs text-zinc-400 mt-1">
                  {isAr ? 'المعرض الرئيسي وحاضنة التركيبات' : 'Main Showroom & Formulation Hub'}
                </p>
              </div>

              {/* Address details */}
              <div className="space-y-4 text-xs md:text-sm">
                <div className="flex items-start gap-3">
                  <MapPin className="w-5 h-5 text-[var(--color-champagne-600)] mt-0.5" />
                  <div>
                    <h4 className="font-bold text-zinc-700">{isAr ? 'عنوان المعرض' : 'Showroom Address'}</h4>
                    <p className="text-zinc-500 mt-1 leading-relaxed">
                      {isAr ? settings.addressAr : settings.addressEn}
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <Clock className="w-5 h-5 text-[var(--color-champagne-600)] mt-0.5" />
                  <div>
                    <h4 className="font-bold text-zinc-700">{isAr ? 'ساعات العمل' : 'Opening Hours'}</h4>
                    <p className="text-zinc-500 mt-1">
                      {settings.openingHours}
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <Phone className="w-5 h-5 text-[var(--color-champagne-600)] mt-0.5" />
                  <div>
                    <h4 className="font-bold text-zinc-700">{isAr ? 'الاتصال الهاتفي' : 'Phone Contact'}</h4>
                    <p className="text-zinc-500 mt-1" dir="ltr">
                      {settings.phone}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Action Buttons Column */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-6 border-t border-zinc-100">
              {settings.directionsButtonEnabled && (
                <button
                  onClick={handleDirectionsClick}
                  className="w-full bg-[var(--color-charcoal-900)] hover:bg-[var(--color-charcoal-800)] text-white text-xs font-bold py-3 rounded-sm transition-all shadow-sm flex items-center justify-center gap-2"
                >
                  <Map className="w-4 h-4" />
                  <span>{isAr ? 'الحصول على الاتجاهات' : 'Get Directions'}</span>
                </button>
              )}
              
              <button
                onClick={handlePhoneClick}
                className="w-full border border-zinc-200 hover:bg-zinc-50 text-zinc-700 text-xs font-bold py-3 rounded-sm transition-all flex items-center justify-center gap-2"
              >
                <Phone className="w-4 h-4" />
                <span>{isAr ? 'اتصال هاتفي' : 'Call Now'}</span>
              </button>

              <button
                onClick={handleWhatsAppClick}
                className="w-full bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold py-3 rounded-sm transition-all flex items-center justify-center gap-2"
              >
                <MessageCircle className="w-4 h-4 font-bold" />
                <span>{isAr ? 'واتساب' : 'WhatsApp'}</span>
              </button>
            </div>
          </div>

          {/* Map Column */}
          <div className="relative rounded-lg overflow-hidden border border-[var(--color-ivory-200)] bg-zinc-100 shadow-sm aspect-auto md:aspect-video lg:aspect-auto min-h-[400px]">
            {loadMap ? (
              <>
                {/* Lazy loaded Iframe with guaranteed native red pin */}
                <iframe
                  title={isAr ? 'خريطة موقع معرض ميكاب ديمو' : 'Makeup Demo Store Map'}
                  src={`https://maps.google.com/maps?q=${settings.latitude},${settings.longitude}&hl=${locale}&z=${settings.mapZoom || 15}&output=embed`}
                  width="100%"
                  height="100%"
                  style={{ border: 0 }}
                  allowFullScreen
                  loading="lazy"
                  referrerPolicy="no-referrer-when-downgrade"
                  className="w-full h-full"
                />
              </>
            ) : (
              // Privacy and Performance placeholder
              <div className="absolute inset-0 w-full h-full flex flex-col items-center justify-center p-6 text-center bg-[var(--color-charcoal-950)] text-white select-none">
                <div className="w-16 h-16 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-2xl mb-4 shadow-inner">
                  <MapPin className="w-6 h-6 text-white/70" />
                </div>
                
                <h4 className="text-sm font-bold text-[var(--color-champagne-400)] mb-1">
                  {isAr ? settings.mapLabelAr || 'خريطة الموقع التفاعلية' : settings.mapLabelEn || 'Interactive Location Map'}
                </h4>
                <p className="text-[10px] text-zinc-400 mb-6 max-w-xs leading-relaxed">
                  {isAr 
                    ? 'لحماية خصوصيتك ولتحسين سرعة تحميل الصفحة، يتم تحميل خرائط جوجل فقط عند الطلب.' 
                    : 'To protect your privacy and optimize performance, the interactive map is loaded on demand.'}
                </p>

                <button
                  onClick={() => setLoadMap(true)}
                  className="bg-[var(--color-champagne-600)] hover:bg-[var(--color-champagne-500)] text-white text-xs font-bold px-6 py-2.5 rounded-sm transition-all shadow active:scale-98"
                >
                  {isAr ? 'عرض الخريطة التفاعلية' : 'Load Interactive Map'}
                </button>
              </div>
            )}
          </div>

        </div>

      </div>
    </section>
  );
}
export default StoreLocationSection;

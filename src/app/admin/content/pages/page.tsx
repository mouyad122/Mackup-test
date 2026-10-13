import React from 'react';
import { requireAuth } from '@/lib/dal';
import { getCMSContent, updateCMSContent } from '@/lib/cms';
import { AdminSidebar } from '@/components/AdminSidebar';
import { revalidatePath } from 'next/cache';
import Link from 'next/link';

export default async function AdminPagesCMS() {
  const session = await requireAuth();

  // Fetch all current CMS texts for the pages
  const about = await getCMSContent('brand_story', { titleAr: 'قصتنا', titleEn: 'Our Story', contentAr: 'تأسست فيلورا بيوتي لتقديم أفضل المكياج.', contentEn: 'Velora Beauty was founded to provide the best makeup.' });
  const ingredients = await getCMSContent('ingredients_page', { titleAr: 'مكونات مكياجنا', titleEn: 'Our Ingredients', contentAr: 'نحن نستخدم مكونات طبيعية 100%.', contentEn: 'We use 100% natural ingredients.' });
  const privacy = await getCMSContent('privacy_policy', { titleAr: 'سياسة الخصوصية', titleEn: 'Privacy Policy', contentAr: 'نحن نحترم خصوصيتك.', contentEn: 'We respect your privacy.' });
  const terms = await getCMSContent('terms_of_service', { titleAr: 'الشروط والأحكام', titleEn: 'Terms of Service', contentAr: 'شروط استخدام الموقع.', contentEn: 'Terms of using the website.' });
  const returns = await getCMSContent('returns_policy', { titleAr: 'سياسة الاسترجاع', titleEn: 'Returns Policy', contentAr: 'يمكنك استرجاع المنتجات خلال 14 يوماً.', contentEn: 'You can return products within 14 days.' });
  const faq = await getCMSContent('faq_content', { titleAr: 'الأسئلة الشائعة', titleEn: 'FAQ', contentAr: 'الأسئلة الشائعة للعملاء.', contentEn: 'Frequently asked questions.' });
  const shipping = await getCMSContent('shipping_policy', { titleAr: 'سياسة الشحن', titleEn: 'Shipping Policy', introAr: 'نشحن إلى جميع مناطق المملكة.', introEn: 'We ship to all regions.' });
  const contact = await getCMSContent('contact_page', { titleAr: 'تواصل معنا', titleEn: 'Contact Us', contentAr: 'نحن هنا لمساعدتك والإجابة على جميع استفساراتك.', contentEn: 'We are here to help you and answer all your inquiries.' });
  const locationInfo = await getCMSContent('store_location_info', {
    addressAr: 'عمان، الأردن - شارع مكة',
    addressEn: 'Amman, Jordan - Mecca St',
    hoursAr: '10:00 ص - 10:00 م',
    hoursEn: '10:00 AM - 10:00 PM',
  });
  async function handleSavePageCMS(formData: FormData) {
    'use server';
    const key = formData.get('cmsKey') as string;
    
    if (key === 'shipping_policy') {
      await updateCMSContent(key, {
        titleAr: formData.get('titleAr'),
        titleEn: formData.get('titleEn'),
        introAr: formData.get('introAr'),
        introEn: formData.get('introEn'),
      });
    } else if (key === 'store_location_info') {
      await updateCMSContent(key, {
        addressAr: formData.get('addressAr'),
        addressEn: formData.get('addressEn'),
        hoursAr: formData.get('hoursAr'),
        hoursEn: formData.get('hoursEn'),
      });
    } else {
      await updateCMSContent(key, {
        titleAr: formData.get('titleAr'),
        titleEn: formData.get('titleEn'),
        contentAr: formData.get('contentAr'),
        contentEn: formData.get('contentEn'),
      });
    }

    // Force Next.js to re-fetch the new content on public pages
    revalidatePath('/', 'layout');
  }

  const pages = [
    { key: 'brand_story', label: 'عن فيلورا بيوتي / قصتنا', data: about },
    { key: 'ingredients_page', label: 'مكوناتنا', data: ingredients },
    { key: 'privacy_policy', label: 'سياسة الخصوصية', data: privacy },
    { key: 'terms_of_service', label: 'الشروط والأحكام', data: terms },
    { key: 'returns_policy', label: 'الاسترجاع والاستبدال', data: returns },
    { key: 'faq_content', label: 'الأسئلة الشائعة', data: faq },
    { key: 'contact_page', label: 'تواصل معنا', data: contact },
  ];

  return (
    <div className="flex flex-col md:flex-row h-screen bg-[var(--color-ivory-100)] overflow-hidden" dir="rtl">
      <AdminSidebar employeeName={session.employee.name} roleName={session?.employee?.role?.name || "ADMIN"} />

      <main className="flex-1 overflow-y-auto p-4 md:p-8 font-sans w-full max-w-full">
        <div className="flex justify-between items-center mb-8 border-b border-[var(--color-ivory-200)] pb-4">
          <div className="flex items-center gap-4">
            <Link href="/admin/content" className="bg-white border border-zinc-200 hover:bg-zinc-100 text-zinc-700 p-2 rounded-lg transition-colors flex items-center justify-center shadow-sm shrink-0" title="الرجوع للصفحة السابقة">
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m9 18 6-6-6-6"/></svg>
            </Link>
            <div>
              <h1 className="text-3xl font-bold font-heading text-[#3F4B32]">
                إدارة صفحات الموقع (الفوتر)
              </h1>
              <p className="text-zinc-650 mt-1">
                تعديل النصوص والشروط للصفحات الثابتة المعروضة في أسفل الموقع. يمكنك استخدام Markdown في الحقول النصية لإضافة نقاط أو خط غامق.
              </p>
            </div>
          </div>
        </div>

        <div className="max-w-4xl space-y-8">
          {pages.map((page) => (
            <form key={page.key} action={handleSavePageCMS} className="bg-white p-6 rounded-lg border border-[var(--color-ivory-200)] shadow-sm space-y-6">
              <div className="flex justify-between items-center border-b pb-2 mb-4">
                <h2 className="text-xl font-bold text-[#3F4B32]">{page.label}</h2>
                <button type="submit" className="bg-[#3F4B32] text-white px-6 py-2 rounded text-sm font-bold hover:bg-[#2d3623] transition-colors">
                  حفظ ({page.label})
                </button>
              </div>

              <input type="hidden" name="cmsKey" value={page.key} />
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-zinc-700 mb-1">العنوان بالعربية</label>
                  <input type="text" name="titleAr" defaultValue={page.data.titleAr} required className="w-full border border-zinc-300 rounded px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[var(--color-champagne-600)]" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-zinc-700 mb-1">العنوان بالإنجليزية</label>
                  <input type="text" name="titleEn" defaultValue={page.data.titleEn} required className="w-full border border-zinc-300 rounded px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[var(--color-champagne-600)]" />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-zinc-700 mb-1">المحتوى بالعربية</label>
                  <textarea name="contentAr" rows={6} defaultValue={page.data.contentAr} required className="w-full border border-zinc-300 rounded px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[var(--color-champagne-600)]" />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-zinc-700 mb-1">المحتوى بالإنجليزية</label>
                  <textarea name="contentEn" rows={6} defaultValue={page.data.contentEn} required className="w-full border border-zinc-300 rounded px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[var(--color-champagne-600)]" />
                </div>
              </div>
            </form>
          ))}

          {/* Shipping Policy Form (Different Schema) */}
          <form action={handleSavePageCMS} className="bg-white p-6 rounded-lg border border-[var(--color-ivory-200)] shadow-sm space-y-6">
            <div className="flex justify-between items-center border-b pb-2 mb-4">
              <h2 className="text-xl font-bold text-[#3F4B32]">الشحن والتوصيل (مقدمة الصفحة)</h2>
              <button type="submit" className="bg-[#3F4B32] text-white px-6 py-2 rounded text-sm font-bold hover:bg-[#2d3623] transition-colors">
                حفظ (الشحن)
              </button>
            </div>
            
            <input type="hidden" name="cmsKey" value="shipping_policy" />
            <p className="text-xs text-zinc-500 mb-4">ملاحظة: جدول أسعار التوصيل يتم إدارته من صفحة &quot;أسعار التوصيل&quot; الخاصة في الإدارة.</p>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-zinc-700 mb-1">العنوان بالعربية</label>
                <input type="text" name="titleAr" defaultValue={shipping.titleAr} required className="w-full border border-zinc-300 rounded px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[var(--color-champagne-600)]" />
              </div>
              <div>
                <label className="block text-sm font-medium text-zinc-700 mb-1">العنوان بالإنجليزية</label>
                <input type="text" name="titleEn" defaultValue={shipping.titleEn} required className="w-full border border-zinc-300 rounded px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[var(--color-champagne-600)]" />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-zinc-700 mb-1">النص التعريفي بالعربية</label>
                <textarea name="introAr" rows={4} defaultValue={shipping.introAr} required className="w-full border border-zinc-300 rounded px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[var(--color-champagne-600)]" />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-zinc-700 mb-1">النص التعريفي بالإنجليزية</label>
                <textarea name="introEn" rows={4} defaultValue={shipping.introEn} required className="w-full border border-zinc-300 rounded px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[var(--color-champagne-600)]" />
              </div>
            </div>
          </form>

          {/* Contact Info Form */}
          <form action={handleSavePageCMS} className="bg-white p-6 rounded-lg border border-[var(--color-ivory-200)] shadow-sm space-y-6">
            <div className="flex justify-between items-center border-b pb-2 mb-4">
              <h2 className="text-xl font-bold text-[#3F4B32]">معلومات الاتصال (عنوان وأوقات عمل)</h2>
              <button type="submit" className="bg-[#3F4B32] text-white px-6 py-2 rounded text-sm font-bold hover:bg-[#2d3623] transition-colors">
                حفظ (معلومات الاتصال)
              </button>
            </div>
            
            <input type="hidden" name="cmsKey" value="store_location_info" />
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-zinc-700 mb-1">العنوان بالعربية</label>
                <input type="text" name="addressAr" defaultValue={locationInfo.addressAr} required className="w-full border border-zinc-300 rounded px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[var(--color-champagne-600)]" />
              </div>
              <div>
                <label className="block text-sm font-medium text-zinc-700 mb-1">العنوان بالإنجليزية</label>
                <input type="text" name="addressEn" defaultValue={locationInfo.addressEn} required className="w-full border border-zinc-300 rounded px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[var(--color-champagne-600)]" />
              </div>
              <div>
                <label className="block text-sm font-medium text-zinc-700 mb-1">أوقات العمل بالعربية</label>
                <input type="text" name="hoursAr" defaultValue={locationInfo.hoursAr} required className="w-full border border-zinc-300 rounded px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[var(--color-champagne-600)]" />
              </div>
              <div>
                <label className="block text-sm font-medium text-zinc-700 mb-1">أوقات العمل بالإنجليزية</label>
                <input type="text" name="hoursEn" defaultValue={locationInfo.hoursEn} required className="w-full border border-zinc-300 rounded px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[var(--color-champagne-600)]" />
              </div>
            </div>
          </form>

        </div>
      </main>
    </div>
  );
}

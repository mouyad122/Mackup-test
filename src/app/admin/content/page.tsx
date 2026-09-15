import React from 'react';
import { requireAuth } from '@/lib/dal';
import { getCMSContent, updateCMSContent } from '@/lib/cms';
import { AdminSidebar } from '@/components/AdminSidebar';
import Link from 'next/link';
import { revalidatePath } from 'next/cache';

export default async function AdminContentPage() {
  const session = await requireAuth();

  const announcement = await getCMSContent('announcement_bar', {
    textAr: 'توصيل مجاني للطلبات فوق 50 د.أ',
    textEn: 'Free delivery for orders above 50 JOD'
  });

  const hero = await getCMSContent('homepage_content', {
    heroTitleAr: 'حين تُترجم الفخامة إلى عطر',
    heroTitleEn: 'When Luxury Translates to Fragrance',
    heroDescAr: 'ميكاب ديمو.. نفحات مختارة بعناية من الشرق، لترافق هويتك وتُشعرك بالأصالة والتميز.',
    heroDescEn: 'Makeup Demo... carefully selected notes from the East, to accompany your identity and make you feel authentic.'
  });

  const socialLinks = await getCMSContent('social_links', {
    instagram: '',
    whatsapp: '',
    facebook: ''
  });

  // Handle Server Action inside component
  async function handleSaveCMS(formData: FormData) {
    'use server';
    const textAr = formData.get('textAr') as string;
    const textEn = formData.get('textEn') as string;
    const heroTitleAr = formData.get('heroTitleAr') as string;
    const heroTitleEn = formData.get('heroTitleEn') as string;
    const heroDescAr = formData.get('heroDescAr') as string;
    const heroDescEn = formData.get('heroDescEn') as string;
    const instagram = formData.get('instagram') as string;
    const whatsapp = formData.get('whatsapp') as string;
    const facebook = formData.get('facebook') as string;

    await Promise.all([
      updateCMSContent('announcement_bar', { textAr, textEn }),
      updateCMSContent('homepage_content', { heroTitleAr, heroTitleEn, heroDescAr, heroDescEn }),
      updateCMSContent('social_links', { instagram, whatsapp, facebook })
    ]);

    revalidatePath('/', 'layout');
  }

  return (
    <div className="flex flex-col md:flex-row h-screen bg-[var(--color-ivory-100)] overflow-hidden" dir="rtl">
      <AdminSidebar employeeName={session.employee.name} roleName={session?.employee?.role?.name || "ADMIN"} />

      <main className="flex-1 overflow-y-auto p-8 font-sans w-full max-w-full">
        <div className="flex justify-between items-center mb-8 border-b border-[var(--color-ivory-200)] pb-4">
          <div>
            <h1 className="text-3xl font-bold font-heading text-[var(--color-charcoal-900)]">
              إدارة المحتوى والموقع (CMS)
            </h1>
            <p className="text-zinc-650 mt-1">تحديث النصوص الرئيسية، شريط الإعلانات، وعناوين الصفحة الرئيسية</p>
          </div>
          <div>
            <Link 
              href="/admin/content/homepage" 
              className="bg-[var(--color-charcoal-800)] hover:bg-[var(--color-charcoal-700)] text-white px-6 py-2 rounded font-bold transition-colors inline-flex items-center gap-2 ml-3"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="18" height="18" x="3" y="3" rx="2" ry="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"/></svg>
              إدارة شريط الإعلانات (Hero Slider)
            </Link>
            <Link 
              href="/admin/content/pages" 
              className="bg-[var(--color-champagne-600)] hover:bg-[var(--color-champagne-500)] text-white px-6 py-2 rounded font-bold transition-colors inline-flex items-center gap-2"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>
              تعديل صفحات الفوتر (Pages)
            </Link>
          </div>
        </div>

        <form action={handleSaveCMS} className="max-w-3xl bg-white p-8 rounded-lg border border-[var(--color-ivory-200)] shadow-sm space-y-8">
          {/* Announcement Bar */}
          <div>
            <h2 className="text-lg font-bold text-[var(--color-charcoal-900)] border-b pb-2 mb-4">شريط الإعلانات العلوي</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-zinc-700 mb-1">الإعلان باللغة العربية</label>
                <input 
                  type="text" 
                  name="textAr"
                  defaultValue={announcement.textAr}
                  className="w-full border border-zinc-300 rounded px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[var(--color-champagne-600)]"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-zinc-700 mb-1">الإعلان باللغة الإنجليزية</label>
                <input 
                  type="text" 
                  name="textEn"
                  defaultValue={announcement.textEn}
                  className="w-full border border-zinc-300 rounded px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[var(--color-champagne-600)]"
                />
              </div>
            </div>
          </div>

          {/* Hero Section */}
          <div>
            <h2 className="text-lg font-bold text-[var(--color-charcoal-900)] border-b pb-2 mb-4">قسم الواجهة الرئيسي (Hero)</h2>
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-zinc-700 mb-1">العنوان بالعربية</label>
                  <input 
                    type="text" 
                    name="heroTitleAr"
                    defaultValue={hero.heroTitleAr}
                    className="w-full border border-zinc-300 rounded px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[var(--color-champagne-600)]"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-zinc-700 mb-1">العنوان بالإنجليزية</label>
                  <input 
                    type="text" 
                    name="heroTitleEn"
                    defaultValue={hero.heroTitleEn}
                    className="w-full border border-zinc-300 rounded px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[var(--color-champagne-600)]"
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-zinc-700 mb-1">الوصف بالعربية</label>
                  <textarea 
                    name="heroDescAr"
                    rows={3}
                    defaultValue={hero.heroDescAr}
                    className="w-full border border-zinc-300 rounded px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[var(--color-champagne-600)]"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-zinc-700 mb-1">الوصف بالإنجليزية</label>
                  <textarea 
                    name="heroDescEn"
                    rows={3}
                    defaultValue={hero.heroDescEn}
                    className="w-full border border-zinc-300 rounded px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[var(--color-champagne-600)]"
                  />
                </div>
              </div>
            </div>
          </div>
            
          {/* Social Links Section */}
          <div className="bg-white p-6 rounded-lg shadow-sm border border-[var(--color-ivory-200)]">
            <h2 className="text-lg font-bold text-[var(--color-charcoal-900)] border-b pb-2 mb-4">روابط التواصل الاجتماعي (تظهر في الفوتر)</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <label className="block text-sm font-bold text-zinc-700 mb-2">انستقرام (Instagram)</label>
                <input
                  type="url"
                  name="instagram"
                  defaultValue={socialLinks.instagram}
                  placeholder="https://instagram.com/..."
                  className="w-full border border-zinc-300 rounded-md px-3 py-2 text-sm outline-none focus:border-[var(--color-champagne-600)]"
                  dir="ltr"
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-zinc-700 mb-2">واتساب (WhatsApp)</label>
                <input
                  type="text"
                  name="whatsapp"
                  defaultValue={socialLinks.whatsapp}
                  placeholder="https://wa.me/..."
                  className="w-full border border-zinc-300 rounded-md px-3 py-2 text-sm outline-none focus:border-[var(--color-champagne-600)]"
                  dir="ltr"
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-zinc-700 mb-2">فيسبوك (Facebook)</label>
                <input
                  type="url"
                  name="facebook"
                  defaultValue={socialLinks.facebook}
                  placeholder="https://facebook.com/..."
                  className="w-full border border-zinc-300 rounded-md px-3 py-2 text-sm outline-none focus:border-[var(--color-champagne-600)]"
                  dir="ltr"
                />
              </div>
            </div>
          </div>

          <div className="flex justify-end pt-4 border-t">
            <button
              type="submit"
              className="bg-[var(--color-charcoal-900)] hover:bg-[var(--color-charcoal-800)] text-white px-6 py-2.5 rounded font-bold text-sm transition-colors"
            >
              حفظ التعديلات
            </button>
          </div>
        </form>
      </main>
    </div>
  );
}

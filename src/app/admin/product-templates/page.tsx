import { requirePermission } from '@/lib/dal';
import { prisma } from '@/lib/db';
import { AdminSidebar } from '@/components/AdminSidebar';
import { installRawaqProductTemplates, saveProductTemplateField } from '@/actions/product-templates';
import { ensureProductTemplatesInstalled } from '@/lib/product-templates';
import Link from 'next/link';

type TemplateRow = {
  id: string;
  nameAr: string;
  fields: Array<{ useAsVariant: boolean; attributeDefinition: { nameAr: string } }>;
};

export default async function ProductTemplatesPage() {
  const session = await requirePermission('manage:products');

  // Auto-install templates if not already seeded
  await ensureProductTemplatesInstalled();

  let templates: TemplateRow[] = [];
  try {
    templates = await prisma.productTemplate.findMany({
      include: {
        fields: {
          include: { attributeDefinition: true },
          orderBy: { sortOrder: 'asc' },
        },
      },
      orderBy: { nameAr: 'asc' },
    });
  } catch {
    // Migration has not been applied yet.
  }

  return (
    <div className="flex min-h-screen flex-col bg-[var(--color-ivory-100)] md:flex-row font-sans" dir="rtl">
      <AdminSidebar employeeName={session.employee.name} roleName={session.employee.role.name} />
      <main className="w-full flex-1 space-y-6 p-4 md:p-8">
        <header>
          <div className="flex items-center gap-3 mb-2">
            <Link href="/admin/products" className="text-sm text-zinc-500 hover:underline">
              المنتجات
            </Link>
            <span className="text-zinc-300">/</span>
            <span className="text-sm font-bold text-zinc-700">القوالب والخصائص</span>
          </div>
          <h1 className="text-3xl font-bold text-[#3F4832]">إدارة خصائص وقوالب المنتجات</h1>
          <p className="mt-1 text-sm text-zinc-600">
            الحقول والقوالب الذكية تعمل الآن تلقائياً ومباشرة داخل شاشة إضافة وتعديل المنتجات.
          </p>
        </header>

        {/* Automation notification banner */}
        <div className="rounded-xl border border-emerald-200 bg-emerald-50/70 p-4 text-sm text-emerald-900 flex items-start gap-3">
          <span className="text-xl">✨</span>
          <div>
            <h3 className="font-bold">التشغيل التلقائي مفعل</h3>
            <p className="mt-0.5 text-xs text-emerald-800 leading-relaxed">
              لا حاجة لتجهيز أو اختيار القوالب يدوياً. بمجرد اختيارك لقسم المنتج (مثل عبايات، أثواب تراثية، فساتين، أو مكياج) أو كتابة اسم المنتج، سيقوم النظام بالتعرف على القالب وعرض الحقول المخصصة تلقائياً وحفظها.
            </p>
          </div>
        </div>

        {!templates.length ? (
          <section className="rounded-xl border bg-white p-6 shadow-sm">
            <h2 className="font-bold text-lg text-zinc-900">تهيئة قوالب رَواق الأساسية</h2>
            <p className="my-2 text-sm text-zinc-600">
              يشمل أحمر الشفاه والسيروم والعبايات والثوب الأردني وبقية القوالب المقترحة (28 قالباً جاهزاً).
            </p>
            <form action={installRawaqProductTemplates}>
              <button className="rounded-lg bg-[#3F4832] px-6 py-2.5 font-bold text-white shadow-sm hover:bg-[#2d3623] transition-colors">
                تهيئة القوالب الأساسية الآن
              </button>
            </form>
          </section>
        ) : (
          <>
            <section className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
              {templates.map(template => (
                <article key={template.id} className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm">
                  <h2 className="font-bold text-sm text-[#3F4832]">{template.nameAr}</h2>
                  <p className="mt-1.5 text-xs text-zinc-500 leading-relaxed">
                    {template.fields
                      .map(field => `${field.attributeDefinition.nameAr}${field.useAsVariant ? ' (متغير)' : ''}`)
                      .join(' · ') || 'لا توجد حقول'}
                  </p>
                </article>
              ))}
            </section>

            <section className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm">
              <h2 className="mb-4 font-bold text-base text-zinc-900">تخصيص أو إضافة حقل جديد لقالب</h2>
              <form action={saveProductTemplateField} className="grid gap-3 md:grid-cols-3">
                <select name="templateId" required className="rounded-lg border p-2 text-sm">
                  {templates.map(template => (
                    <option key={template.id} value={template.id}>
                      {template.nameAr}
                    </option>
                  ))}
                </select>
                <input name="nameAr" required placeholder="اسم الحقل بالعربية" className="rounded-lg border p-2 text-sm" />
                <input
                  name="key"
                  required
                  placeholder="مفتاح تقني: fabric_type"
                  dir="ltr"
                  className="rounded-lg border p-2 text-sm font-mono"
                />
                <select name="inputType" className="rounded-lg border p-2 text-sm">
                  <option value="TEXT">نص</option>
                  <option value="NUMBER">رقم</option>
                  <option value="SELECT">قائمة</option>
                  <option value="MULTISELECT">اختيار متعدد</option>
                  <option value="COLOR">لون</option>
                  <option value="BOOLEAN">نعم / لا</option>
                  <option value="TEXTAREA">نص طويل</option>
                </select>
                <textarea name="options" placeholder="قيمة في كل سطر للقوائم" className="rounded-lg border p-2 text-sm" />
                <input name="sortOrder" type="number" defaultValue="0" className="rounded-lg border p-2 text-sm" />
                <div className="flex flex-wrap gap-4 md:col-span-3 py-2">
                  <label className="flex items-center gap-1.5 text-xs">
                    <input name="isRequired" value="true" type="checkbox" /> إجباري
                  </label>
                  <label className="flex items-center gap-1.5 text-xs">
                    <input name="showOnProductPage" value="true" type="checkbox" defaultChecked /> يظهر للعميلة
                  </label>
                  <label className="flex items-center gap-1.5 text-xs">
                    <input name="isFilterable" value="true" type="checkbox" /> فلتر
                  </label>
                  <label className="flex items-center gap-1.5 text-xs">
                    <input name="useAsVariant" value="true" type="checkbox" /> متغير
                  </label>
                </div>
                <button className="rounded-lg bg-[#3F4832] px-6 py-2.5 font-bold text-white shadow-sm hover:bg-[#2d3623] transition-colors md:col-span-3 w-fit">
                  حفظ الحقل
                </button>
              </form>
            </section>
          </>
        )}
      </main>
    </div>
  );
}

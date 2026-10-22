import Link from 'next/link';
import Image from 'next/image';
import type { Metadata } from 'next';
import { OliveBranchDecoration } from '@/components/RawaqMotifs';

export const metadata: Metadata = {
  title: 'قصتنا | رَواق — أناقة من روح الأصالة',
  description: 'تعرّفي على قصة رَواق وروحها المستوحاة من الأردن الجميل — من التراث إلى الجمال المعاصر.',
};

export const revalidate = 86400;

export default async function AboutPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const isAr = locale !== 'en';

  return (
    <main dir={isAr ? 'rtl' : 'ltr'} className="overflow-x-hidden">

      {/* ═══════════════════════════════════════════════════
          المشهد 01 — الاستهلال: الصورة الافتتاحية والنافذة المعمارية
      ═══════════════════════════════════════════════════ */}
      <section className="relative min-h-[75vh] sm:min-h-[85vh] flex items-center justify-center overflow-hidden bg-[#2D3424]">
        {/* الخلفية الزيتونية التراثية العميقة */}
        <div
          className="absolute inset-0"
          style={{
            background: 'radial-gradient(ellipse at 50% 30%, #4D5A3E 0%, #3F4832 50%, #2D3424 100%)',
          }}
        />

        {/* زخارف زيتونية معمارية خفيفة */}
        <OliveBranchDecoration className="absolute -start-24 -top-24 w-96 text-white opacity-[0.06] pointer-events-none rotate-45" />
        <OliveBranchDecoration className="absolute -end-24 -bottom-24 w-96 text-white opacity-[0.06] pointer-events-none -rotate-135" />

        {/* قوس معماري رمزي في الخلفية */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="w-[85vw] max-w-[680px] h-[70vh] rounded-t-[22rem] border border-[#B7935F]/20 opacity-40" />
        </div>

        {/* المحتوى التحريري الرئيسي */}
        <div className="relative z-10 mx-auto w-full max-w-4xl px-5 sm:px-8 py-20 text-center">
          <span className="inline-flex items-center gap-2 mb-5 px-4 py-1 rounded-full border border-[#B7935F]/40 bg-[#B7935F]/10 text-[#D9C6A8] text-xs font-bold tracking-[0.25em] uppercase">
            ✦ {isAr ? 'هوية رَواق' : 'THE ESSENCE OF RAWAQ'} ✦
          </span>
          <h1 className="text-4xl sm:text-6xl lg:text-7xl font-bold text-white leading-[1.25] mb-6 font-heading">
            {isAr ? 'رَواق...' : 'Rawaq...'}
            <br />
            <span className="text-[#D9C6A8]">
              {isAr ? 'أناقة من روح الأصالة' : 'Elegance rooted in heritage'}
            </span>
          </h1>
          <p className="text-base sm:text-xl text-white/80 max-w-2xl mx-auto leading-relaxed">
            {isAr
              ? 'هناك جمال لا يرتبط بزمن، وأصالة تبقى ناضرة مهما تغيّرت تفاصيل الحياة.'
              : 'There is a beauty untethered from time, and an authenticity that endures through every change.'}
          </p>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════
          المشهد 02 — لماذا رَواق؟ (الفلسفة والبداية)
      ═══════════════════════════════════════════════════ */}
      <section className="bg-[#F7F3EA] py-20 sm:py-28 relative">
        <div className="mx-auto max-w-4xl px-5 sm:px-8 text-center">
          <span className="rawaq-eyebrow text-[#B7935F]">{isAr ? 'فلسفتنا' : 'OUR PHILOSOPHY'}</span>
          <h2 className="mt-4 text-3xl sm:text-4xl lg:text-5xl font-bold text-[#3F4832] leading-[1.35] font-heading">
            {isAr ? 'لماذا رَواق؟' : 'Why Rawaq?'}
          </h2>
          <div className="mx-auto my-7 h-px w-14 bg-[#B7935F]" />

          <div className="space-y-6 text-[#3D3A37] text-base sm:text-lg leading-relaxed max-w-2xl mx-auto">
            <p className="font-medium text-lg sm:text-xl text-[#2B2B2B]">
              {isAr
                ? 'نؤمن بأن الأناقة لا تحتاج إلى الصخب لتترك أثراً، وأن أجمل التفاصيل هي تلك التي تنبع من الهوية وتعبّر عنكِ بكل هدوء.'
                : 'We believe elegance needs no noise to leave an impression; the most enduring details are those rooted in identity, expressing who you are with calm grace.'}
            </p>
            <p className="text-[#626262]">
              {isAr
                ? 'في رَواق، نستلهم من ماضينا دفئه وسكينته، ومن حاضرنا حيويته وذوقه الرفيع، لنمنحكِ تجربة تسوق أردنية راقية، يشعر فيها كل اختيار بأنه صُنع ليليق بكِ.'
                : 'At Rawaq, we draw warmth and serenity from our heritage, and modern refinement from the present, offering an authentic Jordanian shopping experience where every detail feels crafted for you.'}
            </p>
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════
          المشهد 03 — من أرضنا نستمد الإلهام (المعمار والتطريز)
      ═══════════════════════════════════════════════════ */}
      <section className="bg-white py-20 sm:py-28 border-y border-[#E9DDCC]">
        <div className="mx-auto max-w-7xl px-5 sm:px-8">
          <div className="grid md:grid-cols-2 gap-12 lg:gap-20 items-center">
            {/* Text Side */}
            <div className={isAr ? 'order-1' : 'order-2'}>
              <span className="rawaq-eyebrow text-[#B7935F]">{isAr ? 'جذورنا' : 'OUR ROOTS'}</span>
              <h2 className="mt-4 text-3xl sm:text-4xl font-bold text-[#3F4832] leading-[1.35] font-heading">
                {isAr ? 'من أرضنا نستمد الإلهام' : 'Inspired by our land'}
              </h2>
              <div className="my-6 h-px w-12 bg-[#B7935F]" />
              <div className="space-y-5 text-[#4a4643] leading-relaxed text-base sm:text-lg">
                <p>
                  {isAr
                    ? 'من حجارة عمّان الدافئة، وأشجار الزيتون الممتدة عبر تلالها، ومن الأقواس الحجرية التي تحتضن بيوتنا القديمة، وفنون التطريز التي طرزتها أيدي الأمهات جيلاً بعد جيل؛ هنا تولد روح رَواق.'
                    : 'From the warm limestone of Amman, the olive groves across our hills, the stone arches framing historic homes, and the embroidery woven with patience across generations; this is where the spirit of Rawaq is born.'}
                </p>
                <p className="text-sm sm:text-base text-[#626262]">
                  {isAr
                    ? 'الأصالة بالنسبة لنا ليست ذكرى عابرة، بل هي نبض حيّ نحمله في جودة المنتجات، ونعومة الألوان، واحترام ذوق المرأة التي تبحث عن الفخامة الحقيقية.'
                    : 'Heritage for us is never just a memory; it is an active pulse carried through product quality, harmonious colors, and a deep appreciation for the woman seeking true refinement.'}
                </p>
              </div>
            </div>

            {/* Visual Side — Heritage Architectural Composition */}
            <div className={`grid grid-cols-2 gap-4 ${isAr ? 'order-2' : 'order-1'}`}>
              <div className="flex flex-col items-center justify-center p-8 rounded-t-[4rem] rounded-b-2xl bg-[#3F4832] text-white shadow-lg text-center">
                <span className="text-3xl text-[#D9C6A8] mb-3">⚱</span>
                <h3 className="font-heading font-bold text-lg mb-1">{isAr ? 'معمار الحجر' : 'Stone Heritage'}</h3>
                <p className="text-xs text-white/70 leading-relaxed">{isAr ? 'دفء الحجر الأردني وأقواسه التاريخية' : 'Warmth of Jordanian stone arches'}</p>
              </div>
              <div className="flex flex-col items-center justify-center p-8 mt-6 rounded-b-[4rem] rounded-t-2xl bg-[#F7F3EA] border border-[#D9C6A8] text-[#3F4832] shadow-md text-center">
                <span className="text-3xl text-[#B7935F] mb-3">🪡</span>
                <h3 className="font-heading font-bold text-lg mb-1">{isAr ? 'خيوط التطريز' : 'Living Embroidery'}</h3>
                <p className="text-xs text-[#746A64] leading-relaxed">{isAr ? 'أناقة الحرفة وذاكرة المكان' : 'Craftsmanship and cultural memory'}</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════
          المشهد 04 — في شعارنا حكاية (الشعار الرسمي وعناصره)
      ═══════════════════════════════════════════════════ */}
      <section className="bg-[#fbfaf8] py-20 sm:py-28">
        <div className="mx-auto max-w-7xl px-5 sm:px-8">
          <div className="grid md:grid-cols-[auto_1fr] gap-12 lg:gap-20 items-center">
            {/* Logo Visual Presentation */}
            <div className="flex items-center justify-center">
              <div className="relative flex items-center justify-center w-56 h-56 sm:w-68 sm:h-68 rounded-full bg-[#3F4832] shadow-2xl p-6">
                <div className="absolute inset-3 rounded-full border border-[#B7935F]/30" />
                <Image
                  src="/brand/logo_rawaq.png"
                  alt={isAr ? 'شعار رَواق الرسمي' : 'Official Rawaq logo'}
                  width={220}
                  height={220}
                  className="relative h-32 sm:h-40 w-auto object-contain filter drop-shadow"
                  priority
                />
              </div>
            </div>

            {/* Elements Description */}
            <div>
              <span className="rawaq-eyebrow text-[#B7935F]">{isAr ? 'رمزية الهوية' : 'OUR IDENTITY'}</span>
              <h2 className="mt-4 text-3xl sm:text-4xl font-bold text-[#3F4832] leading-[1.35] font-heading">
                {isAr ? 'في شعارنا حكاية' : 'A story in our mark'}
              </h2>
              <div className="my-6 h-px w-12 bg-[#B7935F]" />
              <p className="text-[#4a4643] leading-relaxed mb-8 text-base sm:text-lg">
                {isAr
                  ? 'يجمع شعار رَواق الرسمي بين ثلاثة رموز أصيلة تختزل علاقتنا بالأرض والمعمار والمستقبل:'
                  : 'The official Rawaq mark unites three enduring symbols reflecting our connection to the land, architecture, and future:'}
              </p>

              <div className="grid sm:grid-cols-3 gap-5">
                {(isAr ? [
                  { symbol: '⌒', title: 'القوس المعماري', desc: 'يستحضر فناء البيت الأردني ورَواقه، حيث تتلاقى التهوية والضوء والسكينة.' },
                  { symbol: '🪔', title: 'غصن الزيتون', desc: 'رمز النقاء والبركة والوفاء للأرض، يعبّر عن استمرارية الجمال عبر العصور.' },
                  { symbol: '✦', title: 'النجمة', desc: 'لمسة إشراق وتميز تتوّج الهوية وتعلن عن روح معاصرة فخورة بأصلها.' },
                ] : [
                  { symbol: '⌒', title: 'The Arch', desc: 'Recalling the traditional Jordanian portico (Rawaq) filled with light and calm.' },
                  { symbol: '🪔', title: 'The Olive Branch', desc: 'A symbol of purity, blessed land, and enduring beauty across centuries.' },
                  { symbol: '✦', title: 'The Star', desc: 'A radiant crown representing modern distinction proud of its heritage.' },
                ]).map(({ symbol, title, desc }) => (
                  <div key={title} className="flex flex-col gap-3 p-6 rounded-2xl bg-white border border-[#E9DDCC] shadow-sm hover:border-[#B7935F] transition-all duration-300">
                    <span className="text-3xl text-[#B7935F] font-bold">{symbol}</span>
                    <h3 className="font-heading font-bold text-[#3F4832] text-lg">{title}</h3>
                    <p className="text-xs sm:text-sm text-[#746A64] leading-relaxed">{desc}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════
          المشهد 05 — عالم يشبه تفاصيلكِ (الثلاثية الجمالية)
      ═══════════════════════════════════════════════════ */}
      <section className="bg-white py-20 sm:py-28">
        <div className="mx-auto max-w-4xl px-5 sm:px-8 text-center">
          <span className="rawaq-eyebrow text-[#B7935F]">{isAr ? 'عالمنا' : 'OUR OFFERING'}</span>
          <h2 className="mt-4 text-3xl sm:text-4xl lg:text-5xl font-bold text-[#3F4832] leading-[1.35] font-heading">
            {isAr ? 'عالم يشبه تفاصيلكِ' : 'A world that matches your details'}
          </h2>
          <div className="mx-auto my-7 h-px w-14 bg-[#B7935F]" />
          <div className="space-y-5 text-[#4a4643] leading-relaxed max-w-2xl mx-auto text-base sm:text-lg">
            <p>
              {isAr
                ? 'نرى الأناقة في تناغمها الكامل: في نفحة عطر ترافقكِ طوال اليوم، وفي لمسة عناية ومكياج تبرز جمالكِ الطبيعي، وفي ثوب أو عباية صُممت بذوق أردني راقٍ.'
                : 'We perceive elegance in its complete harmony: in a fragrant note that accompanies you, in a beauty touch that elevates your natural glow, and in an embroidered dress designed with timeless grace.'}
            </p>
          </div>

          {/* تبويبات سريعة للتصنيفات بحواف ناعمة */}
          <div className="mt-12 flex flex-wrap items-center justify-center gap-3">
            <Link href={`/${locale}/shop`} className="btn-rawaq-filter active">
              {isAr ? 'تصفحي جميع المجموعات' : 'Explore All Collections'}
            </Link>
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════
          المشهد 06 — الخاتمة والدعوة (لكل يوم تفاصيله... ولكِ رَواقكِ)
      ═══════════════════════════════════════════════════ */}
      <section className="bg-[#3F4832] py-20 sm:py-28 relative overflow-hidden text-white">
        <OliveBranchDecoration className="absolute -end-20 -bottom-20 w-80 text-white opacity-[0.05] pointer-events-none" />
        <OliveBranchDecoration className="absolute -start-20 -top-20 w-80 text-white opacity-[0.05] pointer-events-none rotate-180" />

        <div className="relative z-10 mx-auto max-w-3xl px-5 sm:px-8 text-center">
          <span className="inline-block mb-4 text-[#D9C6A8] text-xs font-bold tracking-[0.25em] uppercase">
            RAWAQ
          </span>
          <h2 className="text-3xl sm:text-5xl font-bold text-white leading-[1.35] mb-6 font-heading">
            {isAr ? 'لكل يوم تفاصيله...' : 'Every day has its details...'}
            <br />
            <span className="text-[#D9C6A8]">
              {isAr ? 'ولكِ رَواقكِ' : 'and you have Rawaq'}
            </span>
          </h2>
          <p className="text-base sm:text-lg text-white/80 max-w-xl mx-auto leading-relaxed mb-10">
            {isAr
              ? 'في رَواق، نحتفي بكل سيدة تختار أسلوبها بثقة وتجد جمالها في التفاصيل التي تشبهها.'
              : 'At Rawaq, we celebrate every woman who defines her style with confidence and finds beauty in the details that feel like her.'}
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <Link href={`/${locale}/shop`} className="btn-rawaq-primary bg-white !text-[#3F4832] hover:bg-[#F7F3EA] shadow-xl">
              {isAr ? 'اكتشفي المجموعة' : 'Discover the collection'}
            </Link>
            <Link href={`/${locale}/contact`} className="btn-rawaq-ghost">
              {isAr ? 'تواصلي معنا' : 'Contact us'}
            </Link>
          </div>
        </div>
      </section>

    </main>
  );
}

import Image from 'next/image';
import Link from 'next/link';
import { getCMSContent } from '@/lib/cms';
import type { Metadata } from 'next';
import { OliveBranchDecoration, ArchFrame } from '@/components/RawaqMotifs';

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  const isAr = locale === 'ar';
  return {
    title: isAr ? 'قصتنا | رَواق' : 'Our Story | Rawaq',
    description: isAr
      ? 'تعرّفي على حكاية رَواق — علامة تجمع الأناقة الأردنية المعاصرة بروح التراث والجمال.'
      : 'Discover the story of Rawaq — where Jordanian contemporary elegance meets heritage and beauty.',
  };
}

export default async function AboutPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const isAr = locale === 'ar';

  const cms = await getCMSContent('brand_story', {
    titleAr: 'حكاية رَواق',
    titleEn: 'The Rawaq Story',
    contentAr: 'رَواق هي المساحة التي تلتقي فيها الأناقة المعاصرة مع جذور الأصالة الأردنية. استوحينا من تمايل أغصان الزيتون، ومن شموخ الجبال، ومن دفء الوجوه الأردنية، لنبتكر لكِ تجربة جمال تُشبهكِ تماماً. نؤمن في رَواق بأن الجمال الحقيقي ينبع من الداخل، ويُزهر حين تتصالحين مع ذاتكِ وتُبرزين هويتكِ بكل فخر: واثقة، أصيلة، وحاضرة في كل تفصيل.',
    contentEn: 'Rawaq is a space where contemporary style meets the spirit of Jordan. Inspired by the swaying olive branches, the majesty of the mountains, and the warmth of Jordanian faces, we create a beauty experience that is truly yours. Beauty is a way to express who you are: confident, authentic, and present in every detail.',
  });

  const values = isAr
    ? [
        ['✦', 'الأصالة', 'نستلهم من روح المكان ونعبّر عنها بلغة اليوم.'],
        ['◇', 'الأنوثة', 'مساحة لكل امرأة لتختار ما يشبهها.'],
        ['❋', 'التفاصيل', 'عناية بالتجربة من أول اختيار إلى آخر لمسة.'],
      ]
    : [
        ['✦', 'Authenticity', 'Inspired by a sense of place, expressed for today.'],
        ['◇', 'Femininity', 'Room for every woman to choose what feels like her.'],
        ['❋', 'Thoughtfulness', 'Care throughout the experience, down to the details.'],
      ];

  return (
    <main className="overflow-x-hidden bg-[#F7F3EA]">

      {/* ═══════════════════════════════════════════════
          HERO — قصتنا
          ═══════════════════════════════════════════════ */}
      <section className="relative overflow-hidden bg-[#3F4B32] py-20 text-white sm:py-28">
        <div className="relative mx-auto max-w-4xl px-6 text-center sm:px-10">
          <p className="rawaq-eyebrow text-[#B7935F]">A JORDANIAN STORY · RAWAQ</p>
          <h1 className="mt-5 text-5xl !text-white sm:text-6xl md:text-7xl">
            {isAr ? 'قصتنا' : 'Our Story'}
          </h1>
          <p className="mt-6 text-lg text-[#B7935F] font-medium">
            {isAr ? 'رَواق… حكاية جمال من أرضنا' : 'Rawaq… a story of beauty from our land'}
          </p>
          {/* Tatreez divider */}
          <div
            className="mx-auto my-8 h-5 max-w-sm opacity-70"
            style={{ backgroundImage: "url('/brand/patterns/rawaq-tatreez-divider.svg')", backgroundRepeat: 'no-repeat', backgroundSize: 'contain', backgroundPosition: 'center' }}
            aria-hidden="true"
          />
          <p className="mx-auto max-w-2xl text-base leading-8 text-white/70">
            {isAr
              ? 'من ألوان الرمان إلى ألوان التطريز الأردني، من دفء الحجارة الأردنية إلى أناقة المرأة العصرية — رَواق حكاية تُعاش.'
              : 'From pomegranate colors to Jordanian embroidery, from the warmth of Jordanian stone to the elegance of the contemporary woman — Rawaq is a story lived.'}
          </p>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════
          BRAND STORY CONTENT (CMS)
          ═══════════════════════════════════════════════ */}
      <section className="py-16 sm:py-24 relative overflow-hidden">
        {/* Decorative Olive Branch */}
        <OliveBranchDecoration className="absolute -end-32 top-10 w-96 text-[#3F4B32] opacity-5 pointer-events-none" />
        
        <div className="mx-auto max-w-7xl px-5 sm:px-8 relative z-10">
          <div className="grid items-center gap-12 md:grid-cols-[1fr_1fr]">
            {/* Logo / image side */}
            <div className="relative order-2 md:order-1">
              <ArchFrame className="max-w-md mx-auto text-[#B7935F]/40 bg-white shadow-[0_20px_60px_rgba(63,75,50,.08)]">
                <div className="relative w-full h-80">
                  <Image
                    src="/brand/logo_rawaq.png"
                    alt={isAr ? 'شعار رَواق' : 'Rawaq logo'}
                    fill
                    sizes="(max-width: 768px) 90vw, 450px"
                    className="object-contain p-4"
                  />
                </div>
              </ArchFrame>
              {/* Floating badge */}
              <div className="absolute -bottom-4 -end-4 rounded-2xl border border-[#E9DDCC] bg-[#3F4B32] text-white px-5 py-3.5 shadow-md">
                <p className="text-xs font-bold tracking-[.14em] uppercase">{isAr ? 'جمال · تراث · أناقة' : 'BEAUTY · HERITAGE · ELEGANCE'}</p>
              </div>
            </div>

            {/* Content */}
            <div className="order-1 md:order-2">
              <p className="rawaq-eyebrow text-[#3F4B32] font-bold">{isAr ? 'قصة رَواق' : 'THE STORY'}</p>
              <h2 className="mt-4 text-3xl sm:text-4xl text-[#3F4B32] font-heading leading-tight">{isAr ? cms.titleAr : cms.titleEn}</h2>
              <div className="mt-4 h-px w-10 bg-[#B7935F]" />
              <p className="mt-6 whitespace-pre-line text-lg leading-9 text-[#746A64]">
                {isAr ? cms.contentAr : cms.contentEn}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════
          POMEGRANATE — لماذا رَواق؟
          ═══════════════════════════════════════════════ */}
      <section className="bg-[#F7F3EA] py-16 sm:py-24">
        <div className="mx-auto max-w-7xl px-5 sm:px-8">
          <div className="mb-12 text-center">
            <p className="rawaq-eyebrow">{isAr ? 'لماذا رَواق؟' : 'WHY RAWAQ?'}</p>
            <h2 className="mt-3 text-3xl sm:text-4xl">
              {isAr ? 'رمزية الرَواق الأردنية' : 'The symbolism of the pomegranate'}
            </h2>
            <div className="mx-auto mt-4 h-px w-12 bg-[#B7935F]" />
          </div>

          <div className="grid gap-6 md:grid-cols-3">
            {(isAr
              ? [
                  ['#3F4B32', 'أغصان الزيتون', 'اللون الزيتوني يعكس ارتباطنا العميق بالأرض الأردنية، حيث تجذّرت أشجار الزيتون لترمز إلى الخلود والسلام والتراث الأصيل.'],
                  ['#D9C6A8', 'دفء الصخر', 'الرمل الدافئ يستوحي لونه من حجارة الأردن العتيقة التي تشهد على حضارات وأمجاد سُطرت في البتراء وغيرها.'],
                  ['#B7935F', 'الجمال الداخلي', 'اللون الذهبي المعتق يمثل بريق الأنوثة وثقة المرأة التي تدرك تماماً أن الجمال ينبع من أصالتها وصدقها.'],
                ]
              : [
                  ['#3F4B32', 'Olive Branches', 'Olive green reflects our deep connection to the Jordanian land, symbolizing eternity, peace, and authentic heritage.'],
                  ['#D9C6A8', 'Warmth of Stone', 'Warm sand is inspired by the ancient stones of Jordan that witness the civilizations and glories of Petra.'],
                  ['#B7935F', 'Inner Beauty', 'Antique gold represents the brilliance of femininity and the confidence of a woman whose beauty stems from her authenticity.'],
                ]
            ).map(([color, title, text]) => (
              <div key={title} className="rounded-2xl border border-[#E9DDCC] bg-white p-7">
                <span
                  aria-hidden="true"
                  style={{ backgroundColor: color }}
                  className="block h-2 w-12 rounded-full mb-5"
                />
                <h3 className="text-lg font-bold text-[#2B2B2B]">{title}</h3>
                <p className="mt-3 text-sm leading-7 text-[#746A64]">{text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════
          HERITAGE — التراث الأردني
          ═══════════════════════════════════════════════ */}
      <section className="bg-[#F7F3EA] py-16 sm:py-20">
        <div className="mx-auto max-w-7xl px-5 sm:px-8">
          <div className="grid items-center gap-10 md:grid-cols-[.9fr_1fr]">
            {/* Tatreez visual panel */}
            <div className="relative overflow-hidden rounded-3xl bg-[#3F4B32] p-8 min-h-56 sm:p-12 flex flex-col justify-center">
              <div
                className="absolute inset-0 opacity-20"
                style={{ backgroundImage: "url('/brand/patterns/rawaq-tatreez-strip.svg')", backgroundRepeat: 'repeat', backgroundSize: 'auto 60px' }}
                aria-hidden="true"
              />
              <div className="relative text-white">
                <p className="rawaq-eyebrow text-[#B7935F]">{isAr ? 'التطريز الأردني' : 'JORDANIAN EMBROIDERY'}</p>
                <h3 className="mt-3 text-2xl !text-white sm:text-3xl">
                  {isAr ? 'الطرز… هوية وفن' : 'Embroidery… identity and art'}
                </h3>
                <p className="mt-4 leading-7 text-white/70 text-sm">
                  {isAr
                    ? 'التطريز الأردني لغة بصرية تنقل الحكاية عبر الأجيال. رَواق تحمل روح هذا الفن في هويتها البصرية.'
                    : 'Jordanian embroidery is a visual language that passes stories through generations. Rawaq carries the spirit of this art in its visual identity.'}
                </p>
              </div>
            </div>

            {/* Text */}
            <div>
              <p className="rawaq-eyebrow">{isAr ? 'من تراثنا' : 'FROM OUR HERITAGE'}</p>
              <h2 className="mt-4 text-3xl sm:text-4xl">
                {isAr ? 'جمال مستوحى من أرضنا' : 'Beauty inspired by our land'}
              </h2>
              <div className="mt-4 h-px w-10 bg-[#B7935F]" />
              <p className="mt-6 leading-8 text-[#746A64]">
                {isAr
                  ? 'الأردن بلد يجمع الطبيعة والتاريخ والفن في لوحة واحدة. من البادية إلى المدينة، من الكوفية إلى الثوب المطرز — كل تفصيل يحكي.'
                  : 'Jordan is a land that brings together nature, history and art in one canvas. From the desert to the city, from the keffiyeh to the embroidered thobe — every detail speaks.'}
              </p>
              <p className="mt-4 leading-8 text-[#746A64]">
                {isAr
                  ? 'رَواق تستلهم من هذا الإرث الجميل لتقدّم تجربة جمال وأزياء معاصرة تحمل دفء المكان وروحه.'
                  : 'Rawaq draws from this beautiful heritage to offer a contemporary beauty and fashion experience that carries the warmth and soul of place.'}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════
          VALUES
          ═══════════════════════════════════════════════ */}
      <section className="bg-[#F7F3EA] py-16 sm:py-20">
        <div className="mx-auto max-w-7xl px-5 sm:px-8">
          <div className="mb-12 text-center">
            <p className="rawaq-eyebrow">{isAr ? 'قيم رَواق' : 'WHAT GUIDES US'}</p>
            <h2 className="mt-3 text-3xl sm:text-4xl">
              {isAr ? 'جمال في التفاصيل، وهوية في الحكاية' : 'Beauty in the details, identity in the story'}
            </h2>
            <div className="mx-auto mt-4 h-px w-12 bg-[#B7935F]" />
          </div>
          <div className="grid gap-4 md:grid-cols-3">
            {values.map(([icon, title, text]) => (
              <article key={title} className="rounded-2xl border border-[#E9DDCC] bg-white p-6 sm:p-8 transition hover:border-[#B7935F]/40 hover:shadow-[0_6px_20px_rgba(139,30,45,.06)]">
                <div className="flex h-11 w-11 items-center justify-center rounded-full bg-[#3F4B32]/[.07] text-xl text-[#3F4B32]" aria-hidden="true">
                  {icon}
                </div>
                <h3 className="mt-5 text-xl">{title}</h3>
                <p className="mt-3 text-sm leading-7 text-[#746A64]">{text}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════
          CLOSING STATEMENT
          ═══════════════════════════════════════════════ */}
      <section className="py-16 sm:py-20">
        <div className="mx-auto max-w-3xl px-5 text-center">
          {/* Tatreez divider */}
          <div
            className="mx-auto mb-8 h-5 max-w-xs opacity-80"
            style={{ backgroundImage: "url('/brand/patterns/rawaq-tatreez-divider.svg')", backgroundRepeat: 'no-repeat', backgroundSize: 'contain', backgroundPosition: 'center' }}
            aria-hidden="true"
          />
          <p className="text-sm font-bold tracking-[.16em] text-[#3F4B32] uppercase mb-4">
            {isAr ? 'رَواق' : 'RAWAQ'}
          </p>
          <blockquote className="text-2xl font-bold leading-relaxed text-[#2B2B2B] sm:text-3xl">
            {isAr
              ? '"تفاصيل تحمل من روح الأردن… وترافق جمالك اليوم"'
              : '"Details that carry the spirit of Jordan… accompanying your beauty today"'}
          </blockquote>
          <div className="mt-4 h-px max-w-[3rem] bg-[#B7935F] mx-auto" />
          <div className="mt-10">
            <Link href={`/${locale}/shop`} className="btn-rawaq-primary">
              {isAr ? 'تسوّقي رَواق' : 'Shop Rawaq'}
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}

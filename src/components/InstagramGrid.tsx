import { getCMSContent } from '@/lib/cms';

/**
 * InstagramGrid — القسم 11: مجتمع رَواق
 * يعرض صوراً من CMS (يُضاف يدوياً من لوحة التحكم)
 */
export async function InstagramGrid({ locale }: { locale: string }) {
  const isAr = locale === 'ar';

  const data = await getCMSContent('instagram_grid', {
    enabled: true,
    handle: 'rawaq.jo',
    photos: [] as Array<{ url: string; alt: string; link: string }>,
    instagramUrl: 'https://instagram.com/rawaq.jo',
  });

  if (!data.enabled) return null;
  if (!data.photos || data.photos.length === 0) return null;

  const photos = data.photos.slice(0, 6);

  return (
    <section className="bg-[#fbfaf8] py-14 sm:py-20" dir={isAr ? 'rtl' : 'ltr'}>
      <div className="mx-auto max-w-7xl px-5 sm:px-8">
        <div className="mb-10 text-center">
          <span className="rawaq-eyebrow">{isAr ? 'مجتمع رَواق' : 'RAWAQ COMMUNITY'}</span>
          <h2 className="mt-3 text-2xl sm:text-3xl font-bold text-[#3F4832]">
            {isAr ? 'رَواق على إنستغرام' : 'Rawaq on Instagram'}
          </h2>
          {data.handle && (
            <p className="mt-2 text-sm text-[#9a9590]">@{data.handle}</p>
          )}
          <div className="mx-auto mt-4 h-px w-10 bg-[#3F4832]" />
        </div>

        {/* Photo Grid — 3×2 desktop / 2×3 mobile */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 sm:gap-3">
          {photos.map((photo: any, i: number) => (
            <a
              key={i}
              href={photo.link || data.instagramUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="group relative aspect-square overflow-hidden rounded-[1rem] bg-[#e8e3d9]"
              aria-label={photo.alt || (isAr ? 'صورة رَواق على إنستغرام' : 'Rawaq on Instagram')}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={photo.url}
                alt={photo.alt || ''}
                className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
                loading="lazy"
              />
              <div className="absolute inset-0 bg-[#3F4832]/0 group-hover:bg-[#3F4832]/20 transition-colors duration-300 flex items-center justify-center">
                <svg className="opacity-0 group-hover:opacity-100 transition-opacity duration-300 text-white" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <rect width="20" height="20" x="2" y="2" rx="5" ry="5"/><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/><line x1="17.5" x2="17.51" y1="6.5" y2="6.5"/>
                </svg>
              </div>
            </a>
          ))}
        </div>

        {/* CTA */}
        <div className="mt-8 text-center">
          <a
            href={data.instagramUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="btn-rawaq-gold inline-flex items-center gap-2 text-sm"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect width="20" height="20" x="2" y="2" rx="5" ry="5"/><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/><line x1="17.5" x2="17.51" y1="6.5" y2="6.5"/>
            </svg>
            {isAr ? 'تابعينا على إنستغرام' : 'Follow us on Instagram'}
          </a>
        </div>
      </div>
    </section>
  );
}

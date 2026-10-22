import { getCMSContent } from '@/lib/cms';

interface AnnouncementBarProps {
  locale?: string;
}

export async function AnnouncementBar({ locale = 'ar' }: AnnouncementBarProps) {
  const isAr = locale === 'ar';

  const data = await getCMSContent('announcement_bar', {
    enabled: true,
    textAr: 'أهلاً بكِ في رَواق — أناقة من روح الأصالة',
    textEn: 'Welcome to Rawaq — Elegance rooted in heritage',
    linkAr: '',
    linkEn: '',
  });

  if (!data.enabled) return null;

  const text = isAr ? data.textAr : data.textEn;
  const link = isAr ? data.linkAr : data.linkEn;

  if (!text) return null;

  return (
    <div
      className="w-full bg-[#3F4832] py-2.5 px-4 text-center"
      dir={isAr ? 'rtl' : 'ltr'}
      role="region"
      aria-label={isAr ? 'إعلان رَواق' : 'Rawaq announcement'}
    >
      {link ? (
        <a
          href={link}
          className="text-[#F7F3EA] text-xs sm:text-sm font-medium tracking-wide hover:text-[#D9C6A8] transition-colors duration-200"
        >
          {text}
        </a>
      ) : (
        <p className="text-[#F7F3EA] text-xs sm:text-sm font-medium tracking-wide m-0">
          {text}
        </p>
      )}
    </div>
  );
}

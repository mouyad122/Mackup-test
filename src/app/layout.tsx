import type { Metadata } from "next";
import { Noto_Naskh_Arabic, Cormorant_Garamond } from "next/font/google";
import "./globals.css";

const notoNaskhArabic = Noto_Naskh_Arabic({
  subsets: ["arabic"],
  variable: "--font-noto-naskh",
  weight: ["400", "500", "600", "700"],
  display: 'swap',
});

const cormorantGaramond = Cormorant_Garamond({
  subsets: ["latin"],
  variable: "--font-cormorant",
  weight: ["400", "500", "600", "700"],
  display: 'swap',
});

const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, '');

export const metadata: Metadata = {
  ...(BASE_URL ? { metadataBase: new URL(BASE_URL) } : {}),
  title: {
    default: 'رَواق | أناقة من روح الأصالة',
    template: '%s | رَواق',
  },
  description:
    'رَواق — كوزمتكس وعبايات وأثواب أردنية وفساتين بروح أردنية معاصرة.',
  icons: {
    icon: [
      { url: '/brand/logo_rawaq.png', type: 'image/png' },
    ],
    apple: [
      { url: '/brand/logo_rawaq.png', type: 'image/png' },
    ],
  },
  keywords: [
    'رَواق', 'RAWAQ', 'عبايات', 'أثواب أردنية', 'فساتين',
    'مكياج',
    'مستحضرات تجميل',
    'عناية بالبشرة',
    'ارواج',
    'كريم اساس',
    'Makeup',
    'Cosmetics',
    'Skincare'
  ],
  authors: [{ name: 'رَواق', ...(BASE_URL ? { url: BASE_URL } : {}) }],
  creator: 'RAWAQ', publisher: 'RAWAQ',
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  openGraph: {
    type: 'website',
    locale: 'ar_JO',
    alternateLocale: ['en_US'],
    ...(BASE_URL ? { url: BASE_URL } : {}),
    siteName: 'رَواق | RAWAQ', title: 'رَواق | أناقة من روح الأصالة',
    description:
      'اكتشفي رَواق: أناقة من روح الأصالة الأردنية.',
    ...(BASE_URL ? { images: [{ url: `${BASE_URL}/brand/logo_rawaq.png`, alt: 'رَواق — RAWAQ' }] } : {}),
  },
  twitter: {
    card: 'summary_large_image',
    title: 'رَواق | RAWAQ', description: 'أناقة من روح الأصالة الأردنية',
    ...(BASE_URL ? { images: [`${BASE_URL}/brand/logo_rawaq.png`] } : {}),
  },
  ...(BASE_URL ? { alternates: { canonical: BASE_URL, languages: { ar: `${BASE_URL}/ar`, en: `${BASE_URL}/en` } } } : {}),
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ar" dir="rtl" className={`${notoNaskhArabic.variable} ${cormorantGaramond.variable}`} style={{ colorScheme: 'light' }}>
      <body className="antialiased min-h-screen flex flex-col">
        {children}
      </body>
    </html>
  );
}

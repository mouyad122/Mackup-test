import type { Metadata } from "next";
import { Cairo, Tajawal } from "next/font/google";
import "./globals.css";

const cairo = Cairo({
  subsets: ["arabic"],
  variable: "--font-cairo",
  weight: ["400", "600", "700", "800"],
  display: 'swap',
});

const tajawal = Tajawal({
  subsets: ["arabic"],
  variable: "--font-tajawal",
  weight: ["400", "500", "700"],
  display: 'swap',
});

const BASE_URL = 'https://www.makeup-demo.com';

export const metadata: Metadata = {
  metadataBase: new URL(BASE_URL),
  title: {
    default: 'ميكاب ديمو | Makeup Demo',
    template: '%s | ميكاب ديمو',
  },
  description:
    'ميكاب ديمو — المتجر التجريبي لمنتجات التجميل والعناية بالبشرة. اكتشفي أحدث الإطلالات ومنتجات الميكاب.',
  icons: {
    icon: [
      { url: '/icon.png', type: 'image/png', sizes: '512x512' },
    ],
    apple: [
      { url: '/apple-icon.png', sizes: '180x180', type: 'image/png' },
    ],
  },
  keywords: [
    'ميكاب ديمو',
    'Makeup Demo',
    'مكياج',
    'مستحضرات تجميل',
    'عناية بالبشرة',
    'ارواج',
    'كريم اساس',
    'Makeup',
    'Cosmetics',
    'Skincare'
  ],
  authors: [{ name: 'ميكاب ديمو', url: BASE_URL }],
  creator: 'Makeup Demo',
  publisher: 'Makeup Demo',
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
    url: BASE_URL,
    siteName: 'ميكاب ديمو | Makeup Demo',
    title: 'ميكاب ديمو | Makeup Demo',
    description:
      'اكتشفي إطلالتك القادمة مع منتجات التجميل المميزة من ميكاب ديمو.',
    images: [
      {
        url: `${BASE_URL}/og-image.jpg`,
        width: 1200,
        height: 630,
        alt: 'ميكاب ديمو — Makeup Demo',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'ميكاب ديمو | Makeup Demo',
    description: 'المتجر التجريبي لمنتجات التجميل والعناية بالبشرة',
    images: [`${BASE_URL}/og-image.jpg`],
  },
  alternates: {
    canonical: BASE_URL,
    languages: {
      'ar': `${BASE_URL}/ar`,
      'en': `${BASE_URL}/en`,
    },
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ar" dir="rtl" className={`${cairo.variable} ${tajawal.variable}`}>
      <body className="antialiased min-h-screen flex flex-col">
        {children}
      </body>
    </html>
  );
}

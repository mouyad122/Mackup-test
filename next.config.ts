import type { NextConfig } from "next";

const securityHeaders = [
  // منع تضمين الموقع داخل iframe (حماية من Clickjacking)
  { key: 'X-Frame-Options', value: 'DENY' },
  // منع تخمين نوع المحتوى (MIME sniffing)
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  // إخفاء الـ Referer من الروابط الخارجية
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  // تقييد صلاحيات المتصفح
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=(self), payment=()' },
  // إجبار HTTPS (HSTS) - 1 سنة
  { key: 'Strict-Transport-Security', value: 'max-age=31536000; includeSubDomains; preload' },
  // XSS Protection
  { key: 'X-XSS-Protection', value: '1; mode=block' },
];

const nextConfig: NextConfig = {
  // إخفاء هوية الـ framework
  poweredByHeader: false,
  // ضغط الاستجابات
  compress: true,
  // تحسين React في production
  reactStrictMode: true,

  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'placehold.co',
      },
      // Supabase Storage
      {
        protocol: 'https',
        hostname: '*.supabase.co',
      },
      {
        protocol: 'https',
        hostname: '*.supabase.com',
      },
    ],
    dangerouslyAllowSVG: true,
    // تحسين جودة الصور
    formats: ['image/avif', 'image/webp'],
    // Cache الصور لمدة أسبوع
    minimumCacheTTL: 604800,
  },

  experimental: {
    serverActions: {
      // تقليل الحد الأقصى لرفع الملفات (50mb كبير جداً)
      bodySizeLimit: '10mb',
    },
  },

  async headers() {
    return [
      {
        // تطبيق Security Headers على كل الصفحات العامة
        source: '/((?!admin|pos|api).*)',
        headers: securityHeaders,
      },
      {
        // تطبيق Security Headers على الصفحات الإدارية أيضاً
        source: '/(admin|pos)(.*)',
        headers: [
          ...securityHeaders,
          // منع فهرسة الصفحات الإدارية
          { key: 'X-Robots-Tag', value: 'noindex, nofollow, noarchive' },
        ],
      },
      {
        // Cache الملفات الثابتة
        source: '/_next/static/(.*)',
        headers: [
          { key: 'Cache-Control', value: 'public, max-age=31536000, immutable' },
        ],
      },
      {
        // Cache الصور العامة
        source: '/uploads/(.*)',
        headers: [
          { key: 'Cache-Control', value: 'public, max-age=604800, stale-while-revalidate=86400' },
        ],
      },
    ];
  },

  async redirects() {
    return [
      {
        source: '/',
        destination: '/ar',
        permanent: true,
      },
    ];
  },
};

export default nextConfig;

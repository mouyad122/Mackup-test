import { prisma } from '@/lib/db';
import { notFound } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { ProductVariantSelector } from '@/components/ProductVariantSelector';
import { ProductGallery } from '@/components/ProductGallery';
import SuggestedProducts from '@/components/SuggestedProducts';
import { BackButton } from '@/components/BackButton';
import type { Metadata } from 'next';

const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, '');

export const dynamic = 'force-dynamic'; // Ensure we get fresh DB data for demo

export async function generateStaticParams() {
  return [];
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string; locale: string }>;
}): Promise<Metadata> {
  const { slug, locale } = await params;
  const isAr = locale === 'ar';

  const product = await prisma.product.findUnique({
    where: { slug },
    include: {
      images: { where: { isMain: true }, take: 1 },
      category: true,
    },
  });

  if (!product) return {};

  const name = isAr ? product.nameAr : product.nameEn;
  const description = product.shortDescription || (isAr
    ? `${product.nameAr} من رَواق.`
    : `${product.nameEn} from Rawaq.`);
  const rawImageUrl = product.images[0]?.url?.replace('local://', '/');
  const imageUrl = rawImageUrl
    ? (BASE_URL && rawImageUrl.startsWith('/') ? `${BASE_URL}${rawImageUrl}` : rawImageUrl)
    : BASE_URL ? `${BASE_URL}/brand/logo_rawaq.png` : '/brand/logo_rawaq.png';

  return {
    title: `${name} | رَواق`,
    description,
    keywords: [
      name,
      'رَواق',
      product.category?.name || '',
      'جمال وأزياء',
      'Rawaq',
    ],
    ...(BASE_URL ? { alternates: { canonical: `${BASE_URL}/${locale}/products/${slug}`, languages: { ar: `${BASE_URL}/ar/products/${slug}`, en: `${BASE_URL}/en/products/${slug}` } } } : {}),
    openGraph: {
      type: 'article',
      title: `${name} | رَواق`,
      description,
      ...(BASE_URL ? { url: `${BASE_URL}/${locale}/products/${slug}` } : {}),
      locale: isAr ? 'ar_JO' : 'en_US',
      ...(BASE_URL || imageUrl.startsWith('http') ? { images: [
        {
          url: imageUrl,
          width: 800,
          height: 800,
          alt: name,
        },
      ] } : {}),
    },
    twitter: {
      card: 'summary_large_image',
      title: `${name} | رَواق`,
      description,
      ...(BASE_URL || imageUrl.startsWith('http') ? { images: [imageUrl] } : {}),
    },
  };
}

export default async function ProductPage({ params }: { params: Promise<{ slug: string; locale: string }> }) {
  const { slug, locale } = await params;
  
  const product = await prisma.product.findUnique({
    where: { slug },
    include: {
      variants: {
        where: { isActive: true },
        include: {
          supplierOffers: {
            where: { isActive: true, supplier: { isActive: true } },
            select: { stock: true },
          },
        },
        orderBy: { price: 'asc' },
      },
      images: { orderBy: { order: 'asc' } },
      category: true,
    }
  });

  if (!product || !product.isVisible) {
    notFound();
  }

  const mainImage = product.images.find(img => img.isMain) || product.images[0];
  const variants = product.variants.map((variant) => ({
    ...variant,
    name: variant.size,
    colorHex: null,
    stock: variant.inventorySource === 'SUPPLIER'
      ? variant.supplierOffers.reduce((total, offer) => total + offer.stock, 0)
      : variant.stock,
  }));

  const isAr = locale === 'ar';
  const productName = isAr ? product.nameAr : product.nameEn;
  const rawMainImageUrl = mainImage?.url?.replace('local://', '/');
  const mainImageUrl = rawMainImageUrl
    ? (BASE_URL && rawMainImageUrl.startsWith('/') ? `${BASE_URL}${rawMainImageUrl}` : rawMainImageUrl)
    : BASE_URL ? `${BASE_URL}/brand/logo_rawaq.png` : '/brand/logo_rawaq.png';

  let suggestedProductsData: Array<{
    id: string;
    slug: string;
    nameAr: string;
    nameEn: string;
    imageUrl: string | null;
    lowestPrice: number;
  }> = [];

  const fallbackProducts = await prisma.product.findMany({
    where: { isVisible: true, id: { not: product.id } },
    include: {
      images: { where: { isMain: true }, take: 1 },
      variants: { where: { isActive: true }, orderBy: { price: 'asc' }, take: 1 },
    },
    orderBy: { createdAt: 'asc' },
    take: 4,
  });

  suggestedProductsData = fallbackProducts.map(p => ({
    id: p.id,
    slug: p.slug,
    nameAr: p.nameAr,
    nameEn: p.nameEn,
    imageUrl: p.images[0]?.url || null,
    lowestPrice: p.variants.length > 0 ? Math.min(...p.variants.map(v => v.price)) : 0,
  }));

  const productSchema = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: productName,
    description: product.shortDescription || productName,
    image: mainImageUrl,
    brand: {
      '@type': 'Brand',
      name: 'Rawaq',
    },
    category: product.category?.name,
    ...(BASE_URL ? { url: `${BASE_URL}/${locale}/products/${product.slug}` } : {}),
    offers: variants.map(v => ({
      '@type': 'Offer',
      price: (v.price / 1000).toFixed(3),
      priceCurrency: 'JOD',
      availability: v.stock > 0 ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock',
      name: v.name,
      seller: {
        '@type': 'Organization',
        name: 'Rawaq',
      },
    })),
  };

  const breadcrumbSchema = BASE_URL ? {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: isAr ? 'الرئيسية' : 'Home', item: `${BASE_URL}/${locale}` },
      { '@type': 'ListItem', position: 2, name: isAr ? 'المتجر' : 'Shop', item: `${BASE_URL}/${locale}/shop` },
      { '@type': 'ListItem', position: 3, name: productName, item: `${BASE_URL}/${locale}/products/${product.slug}` },
    ],
  } : null;

  return (
    <div className="bg-[#F7F3EA] pb-24">
      {/* Background Decor */}
      <div className="absolute top-0 start-0 w-full h-[500px] bg-gradient-to-b from-white to-transparent pointer-events-none" />

      <div className="container mx-auto px-5 sm:px-8 py-8 sm:py-12 relative z-10">
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(productSchema) }} />
        {breadcrumbSchema && <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }} />}

        <div className="mb-8 flex items-center justify-between">
          <BackButton text={isAr ? 'الرجوع للخلف' : 'Go Back'} />

          <div className="hidden sm:flex text-xs font-bold tracking-wider text-[#A69A8C] uppercase items-center gap-2">
            <Link href={`/${locale}`} className="hover:text-[#B7935F] transition-colors">{isAr ? 'الرئيسية' : 'Home'}</Link>
            <span className="text-[#E9DDCC]">/</span>
            <Link href={`/${locale}/shop`} className="hover:text-[#B7935F] transition-colors">{isAr ? 'المتجر' : 'Shop'}</Link>
            {product.category && (
              <>
                <span className="text-[#E9DDCC]">/</span>
                <Link href={`/${locale}/shop?category=${product.category.id}`} className="hover:text-[#B7935F] transition-colors">{product.category.name}</Link>
              </>
            )}
            <span className="text-[#E9DDCC]">/</span>
            <span className="text-[#2B2B2B]">{productName}</span>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[1fr_1fr] gap-10 lg:gap-16 items-start">
          {/* Product Images (Interactive Gallery) */}
          <div className="sticky top-28">
            <ProductGallery images={product.images} productName={productName} isAr={isAr} categorySlug={product.category?.slug} />
          </div>

          {/* Product Info */}
          <div className="flex flex-col pt-2 lg:pt-6">
            <div className="flex flex-col items-start gap-4 mb-6">
              <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold font-heading text-[#2B2B2B] leading-tight drop-shadow-sm">
                {isAr ? product.nameAr : product.nameEn}
              </h1>
            </div>

            <p className="text-[#746A64] leading-relaxed mb-10 text-base sm:text-lg">
              {product.shortDescription || (isAr ? 'عززي جمالك الطبيعي مع هذا المنتج الاستثنائي الذي يوفر لك مظهراً مثالياً وجذاباً طوال اليوم.' : 'Enhance your natural beauty with this exceptional product that provides a perfect and attractive look all day long.')}
            </p>

            <ProductVariantSelector
              variants={variants}
              locale={locale}
              product={{ id: product.id, nameAr: product.nameAr, nameEn: product.nameEn }}
              mainImage={mainImage?.url}
            />

            {product.longDescription && (
              <div className="mt-12 space-y-2 border-t border-[#E9DDCC] pt-8">
                <details className="group rounded-2xl border border-[#E9DDCC] bg-white overflow-hidden shadow-sm hover:shadow-[0_4px_16px_rgba(139,30,45,.03)] transition-all">
                  <summary className="flex justify-between items-center font-bold cursor-pointer list-none text-[#2B2B2B] p-5">
                    <span className="flex items-center gap-3">
                      <span className="text-[#B7935F]">✦</span>
                      {isAr ? 'تفاصيل المنتج' : 'Product Details'}
                    </span>
                    <span className="transition-transform duration-300 group-open:rotate-180 text-[#B7935F]">
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6"/></svg>
                    </span>
                  </summary>
                  <div className="px-5 pb-5 text-[#746A64] leading-relaxed border-t border-[#E9DDCC]/50 mt-1 pt-4">
                    {product.longDescription}
                  </div>
                </details>
              </div>
            )}
          </div>
        </div>

        {/* Suggested Products Section */}
        <div className="mt-24 pt-16 border-t border-[#E9DDCC]">
          <div className="text-center mb-12">
            <p className="rawaq-eyebrow text-[#B7935F] mb-2">{isAr ? 'اختياراتنا لكِ' : 'CURATED FOR YOU'}</p>
            <h2 className="text-3xl md:text-4xl font-bold font-heading text-[#2B2B2B]">{isAr ? 'قد يعجبك أيضاً' : 'You May Also Like'}</h2>
          </div>
          <SuggestedProducts products={suggestedProductsData} locale={locale} />
        </div>
      </div>
    </div>
  );
}

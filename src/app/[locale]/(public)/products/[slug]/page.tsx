import { prisma } from '@/lib/db';
import { notFound } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { ProductVariantSelector } from '@/components/ProductVariantSelector';
import { ProductGallery } from '@/components/ProductGallery';
import SuggestedProducts from '@/components/SuggestedProducts';
import { BackButton } from '@/components/BackButton';
import type { Metadata } from 'next';

const BASE_URL = 'https://www.makeup-demo.com';

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
      brand: true,
    },
  });

  if (!product) return {};

  const name = isAr ? product.nameAr : product.nameEn;
  const description =
    product.shortDescription ||
    (isAr
      ? `اشتري ${product.nameAr} من ميكاب ديمو — أرقى منتجات التجميل`
      : `Buy ${product.nameEn} from Makeup Demo — Premium Beauty Products`);
  const imageUrl = product.images[0]?.url?.startsWith('local://') || product.images[0]?.url?.startsWith('/')
    ? `${BASE_URL}${product.images[0]?.url.replace('local://', '/')}`
    : product.images[0]?.url || `${BASE_URL}/og-image.jpg`;

  return {
    title: `${name} | ميكاب ديمو`,
    description,
    keywords: [
      name,
      'ميكاب ديمو',
      product.category?.name || '',
      product.brand?.nameAr || '',
      'منتجات تجميل',
      'Makeup Demo',
    ],
    alternates: {
      canonical: `${BASE_URL}/${locale}/products/${slug}`,
      languages: {
        ar: `${BASE_URL}/ar/products/${slug}`,
        en: `${BASE_URL}/en/products/${slug}`,
      },
    },
    openGraph: {
      type: 'article',
      title: `${name} | ميكاب ديمو`,
      description,
      url: `${BASE_URL}/${locale}/products/${slug}`,
      locale: isAr ? 'ar_JO' : 'en_US',
      images: [
        {
          url: imageUrl,
          width: 800,
          height: 800,
          alt: name,
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title: `${name} | ميكاب ديمو`,
      description,
      images: [imageUrl],
    },
  };
}

export default async function ProductPage({ params }: { params: Promise<{ slug: string; locale: string }> }) {
  const { slug, locale } = await params;
  
  const product = await prisma.product.findUnique({
    where: { slug },
    include: {
      variants: { orderBy: { price: 'asc' } },
      images: { orderBy: { order: 'asc' } },
      category: true,
      brand: true,
      similarProducts: {
        include: {
          similar: {
            include: {
              images: { where: { isMain: true }, take: 1 },
              variants: { orderBy: { price: 'asc' }, take: 1 },
            }
          }
        },
        orderBy: { order: 'asc' },
        take: 3,
      },
    }
  });

  if (!product || !product.isVisible) {
    notFound();
  }

  const mainImage = product.images.find(img => img.isMain) || product.images[0];
  const lowestPrice = product.variants.length > 0 
    ? Math.min(...product.variants.map(v => v.price))
    : 0;

  const isAr = locale === 'ar';
  const productName = isAr ? product.nameAr : product.nameEn;
  const mainImageUrl = mainImage?.url?.startsWith('local://')
    ? `${BASE_URL}${mainImage.url.replace('local://', '/')}`
    : mainImage?.url || `${BASE_URL}/og-image.jpg`;

  let suggestedProductsData: Array<{
    id: string;
    slug: string;
    nameAr: string;
    nameEn: string;
    imageUrl: string | null;
    lowestPrice: number;
  }> = [];

  if (product.similarProducts.length > 0) {
    suggestedProductsData = product.similarProducts
      .map(sp => sp.similar)
      .filter(p => p.isVisible)
      .map(p => ({
        id: p.id,
        slug: p.slug,
        nameAr: p.nameAr,
        nameEn: p.nameEn,
        imageUrl: p.images[0]?.url || null,
        lowestPrice: p.variants.length > 0 ? Math.min(...p.variants.map(v => v.price)) : 0,
      }));
  } else {
    const fallbackProducts = await prisma.product.findMany({
      where: { isVisible: true, id: { not: product.id } },
      include: {
        images: { where: { isMain: true }, take: 1 },
        variants: { orderBy: { price: 'asc' }, take: 1 },
      },
      orderBy: { createdAt: 'asc' },
      take: 3,
    });

    suggestedProductsData = fallbackProducts.map(p => ({
      id: p.id,
      slug: p.slug,
      nameAr: p.nameAr,
      nameEn: p.nameEn,
      imageUrl: p.images[0]?.url || null,
      lowestPrice: p.variants.length > 0 ? Math.min(...p.variants.map(v => v.price)) : 0,
    }));
  }

  const productSchema = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: productName,
    description: product.shortDescription || productName,
    image: mainImageUrl,
    brand: {
      '@type': 'Brand',
      name: product.brand ? (isAr ? product.brand.nameAr : product.brand.nameEn) : 'Makeup Demo',
    },
    category: product.category?.name || 'Cosmetics',
    url: `${BASE_URL}/${locale}/products/${product.slug}`,
    offers: product.variants.map(v => ({
      '@type': 'Offer',
      price: (v.price / 100).toFixed(2),
      priceCurrency: 'JOD',
      availability: 'https://schema.org/InStock',
      name: v.name,
      seller: {
        '@type': 'Organization',
        name: 'Makeup Demo',
      },
    })),
  };

  const breadcrumbSchema = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: isAr ? 'الرئيسية' : 'Home', item: `${BASE_URL}/${locale}` },
      { '@type': 'ListItem', position: 2, name: isAr ? 'المتجر' : 'Shop', item: `${BASE_URL}/${locale}/shop` },
      { '@type': 'ListItem', position: 3, name: productName, item: `${BASE_URL}/${locale}/products/${product.slug}` },
    ],
  };

  return (
    <div className="container mx-auto px-6 py-12">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(productSchema) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }} />

      <BackButton text={isAr ? 'الرجوع للخلف' : 'Go Back'} />

      <div className="flex text-sm text-[var(--color-rose-600)] font-bold mb-8 gap-2 flex-wrap">
        <Link href={`/${locale}`}>{isAr ? 'الرئيسية' : 'Home'}</Link>
        <span>/</span>
        <Link href={`/${locale}/shop`}>{isAr ? 'المتجر' : 'Shop'}</Link>
        <span>/</span>
        {product.category && (
          <>
            <Link href={`/${locale}/shop?category=${product.category.id}`}>{product.category.name}</Link>
            <span>/</span>
          </>
        )}
        <span className="text-[var(--color-charcoal-900)]">{productName}</span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
        {/* Product Images (Interactive Gallery) */}
        <ProductGallery images={product.images} productName={productName} isAr={isAr} categorySlug={product.category?.slug} />

        {/* Product Info */}
        <div className="flex flex-col">
          {product.brand && (
            <Link href={`/${locale}/shop?brand=${product.brand.id}`} className="text-sm font-bold tracking-widest uppercase text-[var(--color-charcoal-600)] mb-2 hover:text-[var(--color-rose-600)] transition-colors">
              {isAr ? product.brand.nameAr : product.brand.nameEn}
            </Link>
          )}
          <h1 className="text-3xl md:text-5xl font-bold font-heading text-[var(--color-charcoal-900)] mb-6">
            {isAr ? product.nameAr : product.nameEn}
          </h1>

          <div className="flex flex-wrap gap-2 mb-6">
            {product.productType && <span className="bg-white text-[var(--color-charcoal-700)] px-3 py-1 rounded-sm text-sm border border-[var(--color-ivory-200)]">{product.productType}</span>}
            {product.finish && <span className="bg-white text-[var(--color-charcoal-700)] px-3 py-1 rounded-sm text-sm border border-[var(--color-ivory-200)]">{isAr ? 'اللمسة:' : 'Finish:'} {product.finish}</span>}
            {product.coverage && <span className="bg-white text-[var(--color-charcoal-700)] px-3 py-1 rounded-sm text-sm border border-[var(--color-ivory-200)]">{isAr ? 'التغطية:' : 'Coverage:'} {product.coverage}</span>}
            {product.skinType && <span className="bg-white text-[var(--color-charcoal-700)] px-3 py-1 rounded-sm text-sm border border-[var(--color-ivory-200)]">{isAr ? 'للبشرة:' : 'Skin:'} {product.skinType}</span>}
          </div>

          <p className="text-zinc-700 leading-relaxed mb-8 text-lg">
            {product.shortDescription || (isAr ? 'عززي جمالك الطبيعي مع هذا المنتج الاستثنائي الذي يوفر لك مظهراً مثالياً وجذاباً طوال اليوم.' : 'Enhance your natural beauty with this exceptional product that provides a perfect and attractive look all day long.')}
          </p>

          <ProductVariantSelector variants={product.variants} locale={locale} product={product} mainImage={mainImage?.url} />

          {/* Beauty Accordions */}
          <div className="mt-12 space-y-4 border-t border-[var(--color-ivory-200)] pt-8">
            {product.benefits && (
              <details className="group border-b border-[var(--color-ivory-200)] pb-4">
                <summary className="flex justify-between items-center font-bold cursor-pointer list-none text-[var(--color-charcoal-900)]">
                  <span>{isAr ? 'الفوائد والمميزات' : 'Benefits & Features'}</span>
                  <span className="transition group-open:rotate-180">
                    <svg fill="none" height="24" shapeRendering="geometricPrecision" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" viewBox="0 0 24 24" width="24"><path d="M6 9l6 6 6-6"></path></svg>
                  </span>
                </summary>
                <p className="text-zinc-600 mt-3 leading-relaxed">
                  {product.benefits}
                </p>
              </details>
            )}
            
            {(product.ingredients || product.howToUse) && (
              <details className="group border-b border-[var(--color-ivory-200)] pb-4">
                <summary className="flex justify-between items-center font-bold cursor-pointer list-none text-[var(--color-charcoal-900)]">
                  <span>{isAr ? 'طريقة الاستخدام والمكونات' : 'How to Use & Ingredients'}</span>
                  <span className="transition group-open:rotate-180">
                    <svg fill="none" height="24" shapeRendering="geometricPrecision" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" viewBox="0 0 24 24" width="24"><path d="M6 9l6 6 6-6"></path></svg>
                  </span>
                </summary>
                <div className="text-zinc-600 mt-3 leading-relaxed space-y-4">
                  {product.howToUse && (
                    <div>
                      <strong className="block text-[var(--color-charcoal-900)]">{isAr ? 'طريقة الاستخدام:' : 'How to Use:'}</strong>
                      <p>{product.howToUse}</p>
                    </div>
                  )}
                  {product.ingredients && (
                    <div>
                      <strong className="block text-[var(--color-charcoal-900)]">{isAr ? 'المكونات:' : 'Ingredients:'}</strong>
                      <p>{product.ingredients}</p>
                    </div>
                  )}
                </div>
              </details>
            )}
          </div>
        </div>
      </div>

      {/* Suggested Products Section */}
      <SuggestedProducts products={suggestedProductsData} locale={locale} />
    </div>
  );
}
